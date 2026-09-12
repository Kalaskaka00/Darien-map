const playerToolsToggle = document.getElementById("player-tools-toggle");
const playerToolsPanel = document.getElementById("player-tools-panel");
const playerSelect = document.getElementById("player-select");
const playerStatusDisplay = document.getElementById("player-status-display");
const measureTool = document.getElementById("measure-tool");

let measurementPoints = [];
let measurementLine = null;
let measurementMarkers = [];
let measurementFinished = false;
let measureReadout = null;
const editorPanel = document.getElementById("editor-panel");

const kilometersToMiles = 0.621371;

function initializeMeasureReadout() {
    const control = L.control({position: "topright"});

    control.onAdd = function() {
        measureReadout = L.DomUtil.create("div", "measure-readout");
        measureReadout.style.display = "none";
        return measureReadout;
    };

    control.addTo(map);
}

function isMeasureToolActive() {
    return measureTool.classList.contains("active");
}

function updateMeasurementReadout() {
    if(!measureReadout)
        return;

    const distanceInMapUnits = measurementPoints.slice(1).reduce((total, point, index) => {
        const previousPoint = measurementPoints[index];
        return total + Math.hypot(
            point[0] - previousPoint[0],
            point[1] - previousPoint[1]
        );
    }, 0);
    const kilometers = distanceInMapUnits * CONFIG.map.kilometersPerMapUnit;
    const miles = kilometers * kilometersToMiles;

    measureReadout.innerHTML = `Distance<br><strong>${kilometers.toFixed(2)} km</strong><br>${miles.toFixed(2)} mi`;
    measureReadout.style.display = measurementPoints.length > 1 ? "block" : "none";
}

function clearMeasurement() {
    if(measurementLine)
        map.removeLayer(measurementLine);

    measurementMarkers.forEach(marker => map.removeLayer(marker));
    measurementLine = null;
    measurementMarkers = [];
    measurementPoints = [];
    measurementFinished = false;

    if(measureReadout)
        measureReadout.style.display = "none";
}

function removeMeasurementPoint(index) {
    measurementPoints.splice(index, 1);
    renderMeasurement();
}

function createMeasurementMarker(point, index) {
    const marker = L.marker(point, {
        draggable: true,
        icon: L.divIcon({
            className: "measurement-point",
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        })
    }).addTo(map);

    marker.on("drag", function(e) {
        measurementPoints[index] = [e.latlng.lat, e.latlng.lng];
        measurementLine.setLatLngs(measurementPoints);
        updateMeasurementReadout();
    });

    marker.on("contextmenu", function(e) {
        L.DomEvent.stop(e);
        removeMeasurementPoint(index);
    });

    return marker;
}

function getNearestSegmentIndex(point) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for(let index = 0; index < measurementPoints.length - 1; index++) {
        const start = measurementPoints[index];
        const end = measurementPoints[index + 1];
        const deltaLat = end[0] - start[0];
        const deltaLng = end[1] - start[1];
        const lengthSquared = deltaLat ** 2 + deltaLng ** 2;
        const position = lengthSquared === 0
            ? 0
            : Math.max(0, Math.min(1, (
                (point.lat - start[0]) * deltaLat +
                (point.lng - start[1]) * deltaLng
            ) / lengthSquared));
        const closestPoint = [
            start[0] + position * deltaLat,
            start[1] + position * deltaLng
        ];
        const distance = Math.hypot(
            point.lat - closestPoint[0],
            point.lng - closestPoint[1]
        );

        if(distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
        }
    }

    return nearestIndex;
}

function addMeasurementPointOnLine(e) {
    if(!isMeasureToolActive() || !measurementFinished)
        return;

    L.DomEvent.stop(e);
    const segmentIndex = getNearestSegmentIndex(e.latlng);
    measurementPoints.splice(segmentIndex + 1, 0, [e.latlng.lat, e.latlng.lng]);
    renderMeasurement();
}

function renderMeasurement() {
    if(measurementLine)
        map.removeLayer(measurementLine);

    measurementMarkers.forEach(marker => map.removeLayer(marker));
    measurementMarkers = measurementPoints.map(createMeasurementMarker);

    measurementLine = L.polyline(measurementPoints, {
        color: "#b22222",
        weight: 3,
        dashArray: "8 6",
        interactive: true
    }).addTo(map);
    measurementLine.on("mousedown", addMeasurementPointOnLine);

    updateMeasurementReadout();
}

function addMeasurementPoint(e) {
    if(!isMeasureToolActive() || measurementFinished)
        return;

    const snapPoint = typeof findSnapPoint === "function"
        ? findSnapPoint(e.latlng.lat, e.latlng.lng)
        : null;
    const point = snapPoint || [e.latlng.lat, e.latlng.lng];
    measurementPoints.push(point);

    renderMeasurement();
}

function addMeasurementPointAt(lat, lng) {
    addMeasurementPoint({
        latlng: {lat, lng}
    });
}

function handleMeasurementContextMenu(e) {
    L.DomEvent.stop(e);

    if(!isMeasureToolActive())
        return;

    if(measurementFinished) {
        clearMeasurement();
        return;
    }

    measurementFinished = true;
}

function toggleMeasureTool() {
    const active = !isMeasureToolActive();
    measureTool.classList.toggle("active", active);

    if(active) {
        measurementFinished = false;
        map.on("click", addMeasurementPoint);
        map.on("contextmenu", handleMeasurementContextMenu);
    } else {
        map.off("click", addMeasurementPoint);
        map.off("contextmenu", handleMeasurementContextMenu);
        clearMeasurement();
    }
}

function updatePlayerToolsPosition() {
    if(!isGM) {
        playerTools.style.bottom = "20px";
        return;
    }

    if(editorPanel.classList.contains("open")) {
        const panelTop = editorPanel.getBoundingClientRect().top;
        playerTools.style.bottom = `${window.innerHeight - panelTop + 10}px`;
    } else {
        playerTools.style.bottom = "78px";
    }
}

// Initialize player dropdown
function initializePlayerTools() {
    // Add all configured players to dropdown
    Object.keys(CONFIG.players).forEach(playerName => {
        const option = document.createElement("option");
        option.value = playerName;
        option.textContent = playerName;
        playerSelect.appendChild(option);
    });

    // Set current player selection
    if(currentPlayer) {
        playerSelect.value = currentPlayer;
    }

    // Update display
    updatePlayerStatus();
}

// Update player status display
function updatePlayerStatus() {
    if(isGM) {
        playerStatusDisplay.textContent = "GM";
        playerStatusDisplay.style.color = "#8b0000";
    } else if(currentPlayer) {
        playerStatusDisplay.textContent = currentPlayer;
        const color = CONFIG.players[currentPlayer] || "#2d2417";
        playerStatusDisplay.style.color = color;
    } else {
        playerStatusDisplay.textContent = "No one";
        playerStatusDisplay.style.color = "#6f5328";
    }
}

// Toggle player tools panel
playerToolsToggle.onclick = function() {
    playerToolsPanel.classList.toggle("open");
    playerToolsToggle.classList.toggle("active");
};

const playerTools = document.getElementById("player-tools");
const editorPanelObserver = new MutationObserver(updatePlayerToolsPosition);
editorPanelObserver.observe(editorPanel, {attributes: true, attributeFilter: ["class"]});
window.addEventListener("resize", updatePlayerToolsPosition);

// Handle player selection
playerSelect.addEventListener("change", function() {
    const selectedPlayer = this.value || null;
    setCurrentPlayer(selectedPlayer);
});

measureTool.addEventListener("click", function(e) {
    e.stopPropagation();
    toggleMeasureTool();
});

// Close panel when clicking outside
document.addEventListener("click", function(e) {
    const playerTools = document.getElementById("player-tools");
    if(!playerTools.contains(e.target)) {
        playerToolsPanel.classList.remove("open");
        playerToolsToggle.classList.remove("active");
    }
});

// Initialize on page load
initializeMeasureReadout();
initializePlayerTools();
updatePlayerToolsPosition();
