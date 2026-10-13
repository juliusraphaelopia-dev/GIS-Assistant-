const $ = (id) => document.getElementById(id);
let savedPoints = [];

function showMessage(id, message, isError = false) {
  const el = $(id);
  el.textContent = message;
  el.style.borderColor = isError ? "#e5aaa7" : "";
  el.style.background = isError ? "#fff3f2" : "";
}
function numberFrom(id, label, min, max) {
  const raw = $(id).value.trim();
  if (raw === "") throw new Error(`Enter ${label}.`);
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return value;
}
function validateLatLon(lat, lon) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("Latitude must be between -90 and 90.");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error("Longitude must be between -180 and 180.");
}
function toDMS(value, isLatitude) {
  const direction = isLatitude ? (value >= 0 ? "N" : "S") : (value >= 0 ? "E" : "W");
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}
function parseDMS(input, isLatitude) {
  const text = input.trim().toUpperCase();
  const nums = text.match(/[+-]?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 1 || nums.length > 3) throw new Error("Enter DMS as degrees minutes seconds direction, e.g. 10 30 37.8 N.");
  const deg = Number(nums[0]), min = nums.length > 1 ? Number(nums[1]) : 0, sec = nums.length > 2 ? Number(nums[2]) : 0;
  if (min < 0 || min >= 60 || sec < 0 || sec >= 60) throw new Error("Minutes and seconds must be from 0 up to, but not including, 60.");
  const direction = text.match(/[NSEW]/)?.[0];
  if (isLatitude && direction && !["N", "S"].includes(direction)) throw new Error("Latitude direction must be N or S.");
  if (!isLatitude && direction && !["E", "W"].includes(direction)) throw new Error("Longitude direction must be E or W.");
  let result = Math.abs(deg) + min / 60 + sec / 3600;
  if (deg < 0 || direction === "S" || direction === "W") result *= -1;
  validateLatLon(isLatitude ? result : 0, isLatitude ? 0 : result);
  return result;
}
function haversine(lat1, lon1, lat2, lon2) {
  const rad = d => d * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function polygonAreaKm2(coords) {
  // Spherical polygon area approximation; coordinates must follow the boundary in order.
  const R = 6371.0088;
  let sum = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[(i + 1) % coords.length];
    const rad = d => d * Math.PI / 180;
    sum += rad(lon2 - lon1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return Math.abs(sum * R * R / 2);
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === btn));
    document.querySelectorAll(".tool").forEach(section => section.classList.toggle("hidden", section.id !== btn.dataset.tab));
  });
});

$("toDmsBtn").addEventListener("click", () => {
  try {
    const lat = numberFrom("latInput", "latitude", -90, 90);
    const lon = numberFrom("lonInput", "longitude", -180, 180);
    showMessage("dmsResult", `Latitude: ${toDMS(lat, true)}\nLongitude: ${toDMS(lon, false)}`);
  } catch (e) { showMessage("dmsResult", e.message, true); }
});
$("fromDmsBtn").addEventListener("click", () => {
  try {
    const lat = parseDMS($("latDms").value, true);
    const lon = parseDMS($("lonDms").value, false);
    showMessage("decimalResult", `Latitude: ${lat.toFixed(7)}\nLongitude: ${lon.toFixed(7)}`);
  } catch (e) { showMessage("decimalResult", e.message, true); }
});
$("distanceBtn").addEventListener("click", () => {
  try {
    const lat1 = numberFrom("aLat", "Point A latitude", -90, 90);
    const lon1 = numberFrom("aLon", "Point A longitude", -180, 180);
    const lat2 = numberFrom("bLat", "Point B latitude", -90, 90);
    const lon2 = numberFrom("bLon", "Point B longitude", -180, 180);
    const km = haversine(lat1, lon1, lat2, lon2);
    showMessage("distanceResult", `${km.toLocaleString(undefined, {maximumFractionDigits: 4})} km · ${(km * 1000).toLocaleString(undefined, {maximumFractionDigits: 2})} metres · ${(km * 0.621371).toLocaleString(undefined, {maximumFractionDigits: 4})} miles`);
  } catch (e) { showMessage("distanceResult", e.message, true); }
});
$("areaBtn").addEventListener("click", () => {
  try {
    const lines = $("vertices").value.trim().split(/\n+/).filter(Boolean);
    if (lines.length < 3) throw new Error("Enter at least three polygon vertices.");
    const coords = lines.map((line, index) => {
      const pair = line.split(/[,\s]+/).filter(Boolean);
      if (pair.length !== 2) throw new Error(`Line ${index + 1}: enter latitude, longitude.`);
      const lat = Number(pair[0]), lon = Number(pair[1]);
      validateLatLon(lat, lon);
      return [lat, lon];
    });
    const km2 = polygonAreaKm2(coords);
    showMessage("areaResult", `Approximate area: ${km2.toLocaleString(undefined, {maximumFractionDigits: 6})} km² · ${(km2 * 100).toLocaleString(undefined, {maximumFractionDigits: 4})} hectares · ${(km2 * 247.105381).toLocaleString(undefined, {maximumFractionDigits: 4})} acres`);
  } catch (e) { showMessage("areaResult", e.message, true); }
});
function addPoint(name, lat, lon, notes = "") {
  validateLatLon(lat, lon);
  savedPoints.push({ name, latitude: lat, longitude: lon, notes });
  renderPoints();
}
$("saveCoordBtn").addEventListener("click", () => {
  try {
    const lat = numberFrom("latInput", "latitude", -90, 90);
    const lon = numberFrom("lonInput", "longitude", -180, 180);
    addPoint(`Coordinate ${savedPoints.length + 1}`, lat, lon, "Saved from coordinate converter");
    showMessage("pointStatus", "Coordinate saved to the point manager.");
  } catch (e) { showMessage("dmsResult", e.message, true); }
});
$("addPointBtn").addEventListener("click", () => {
  try {
    const name = $("pointName").value.trim();
    if (!name) throw new Error("Enter a point name.");
    const lat = numberFrom("pointLat", "latitude", -90, 90);
    const lon = numberFrom("pointLon", "longitude", -180, 180);
    addPoint(name, lat, lon, $("pointNotes").value.trim());
    $("pointName").value = ""; $("pointLat").value = ""; $("pointLon").value = ""; $("pointNotes").value = "";
    showMessage("pointStatus", "Point added.");
  } catch (e) { showMessage("pointStatus", e.message, true); }
});
function renderPoints() {
  const body = $("pointsBody");
  body.replaceChildren();
  if (!savedPoints.length) {
    const tr = document.createElement("tr"), td = document.createElement("td");
    td.colSpan = 5; td.className = "empty"; td.textContent = "No points saved yet."; tr.appendChild(td); body.appendChild(tr); return;
  }
  savedPoints.forEach((point, index) => {
    const tr = document.createElement("tr");
    [point.name, point.latitude.toFixed(7), point.longitude.toFixed(7), point.notes].forEach(value => {
      const td = document.createElement("td"); td.textContent = value; tr.appendChild(td);
    });
    const action = document.createElement("td"), remove = document.createElement("button");
    remove.className = "delete-point"; remove.textContent = "Remove";
    remove.addEventListener("click", () => { savedPoints.splice(index, 1); renderPoints(); });
    action.appendChild(remove); tr.appendChild(action); body.appendChild(tr);
  });
}
$("clearPointsBtn").addEventListener("click", () => {
  if (savedPoints.length && confirm("Clear all saved points? This cannot be undone.")) {
    savedPoints = []; renderPoints(); showMessage("pointStatus", "All points cleared.");
  }
});
$("exportBtn").addEventListener("click", () => {
  if (!savedPoints.length) { showMessage("pointStatus", "Add at least one point before exporting.", true); return; }
  const escapeCsv = value => `"${String(value).replace(/"/g, '""')}"`;
  const rows = [["name", "latitude", "longitude", "notes"], ...savedPoints.map(p => [p.name, p.latitude, p.longitude, p.notes])];
  const csv = rows.map(row => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = "geoassist-points.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  showMessage("pointStatus", "CSV export started.");
});
$("locateBtn").addEventListener("click", () => {
  if (!navigator.geolocation) { showMessage("locationStatus", "Location is not supported by this browser.", true); return; }
  showMessage("locationStatus", "Requesting device location…");
  navigator.geolocation.getCurrentPosition(position => {
    const lat = position.coords.latitude, lon = position.coords.longitude;
    $("latInput").value = lat.toFixed(7); $("lonInput").value = lon.toFixed(7);
    $("pointLat").value = lat.toFixed(7); $("pointLon").value = lon.toFixed(7);
    showMessage("locationStatus", `Location found (accuracy about ${Math.round(position.coords.accuracy)} m). Review the coordinates before using them.`);
  }, error => {
    const message = error.code === 1 ? "Location permission was denied. Allow location access in your browser settings." :
      error.code === 2 ? "Your device could not determine a location. Try outdoors or enable location services." :
      "Location request timed out. Please try again.";
    showMessage("locationStatus", message, true);
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
});
