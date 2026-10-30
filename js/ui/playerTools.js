const playerToolsToggle = document.getElementById("player-tools-toggle");
const playerToolsPanel = document.getElementById("player-tools-panel");
const playerSelect = document.getElementById("player-select");
const playerStatusDisplay = document.getElementById("player-status-display");
const measureTool = document.getElementById("measure-tool");
const playerToolVisibilityButton = document.getElementById("player-tool-visibility");
const laserTool = document.getElementById("laser-tool");

const PLAYER_TOOL_VISIBILITY_KEY = "darien-map-measurement-visibility";
const PLAYER_TOOL_VISIBILITY_STAGES = [
    {value: "everyone", label: "Everyone"},
    {value: "gm", label: "GM only"},
    {value: "private", label: "Only me"}
];
const measurementSessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const remoteMeasurements = new Map();
let measurementPoints = [];
let measurementLine = null;
let measurementMarkers = [];
let measurementFinished = false;
let measureReadout = null;
let playerToolVisibility = localStorage.getItem(PLAYER_TOOL_VISIBILITY_KEY) || "everyone";
const editorPanel = document.getElementById("editor-panel");

const kilometersToMiles = 0.621371;

if(!PLAYER_TOOL_VISIBILITY_STAGES.some(stage => stage.value === playerToolVisibility))
    playerToolVisibility = "everyone";

function getMeasurementReadoutContent(points) {
    const distanceInMapUnits = points.slice(1).reduce((total, point, index) => {
        const previousPoint = points[index];
        return total + Math.hypot(
            point[0] - previousPoint[0],
            point[1] - previousPoint[1]
        );
    }, 0);
    const kilometers = distanceInMapUnits * CONFIG.map.kilometersPerMapUnit;
    const miles = kilometers * kilometersToMiles;

    return `Distance<br><strong>${kilometers.toFixed(2)} km</strong><br>${miles.toFixed(2)} mi`;
}

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

    measureReadout.innerHTML = getMeasurementReadoutContent(measurementPoints);
    measureReadout.style.display = measurementPoints.length > 1 ? "block" : "none";
}

function getPlayerToolSender() {
    if(isGM)
        return {role: "gm", name: "GM"};
    if(currentPlayer && Object.prototype.hasOwnProperty.call(CONFIG.players, currentPlayer))
        return {role: "player", name: currentPlayer};
    return {role: "guest", name: null};
}

function getPlayerToolVisibility() {
    return playerToolVisibility;
}

function isPlayerToolVisibleToCurrentUser(tool) {
    if(!tool.visibility || tool.visibility === "everyone")
        return true;
    if(tool.visibility !== "gm")
        return false;
    if(isGM)
        return true;

    const sender = getPlayerToolSender();
    return sender.role !== "guest" &&
        sender.role === tool.role &&
        sender.name === tool.name;
}

function sendMeasurementUpdate(payload) {
    if(pingRealtime) {
        pingChannel.send({
            type: "broadcast",
            event: MEASUREMENT_EVENT_NAME,
            payload
        });
    } else if(pingChannel) {
        pingChannel.postMessage(payload);
    } else {
        localStorage.setItem(MEASUREMENT_FALLBACK_KEY, JSON.stringify(payload));
    }
}

function publishMeasurement(active) {
    const sender = getPlayerToolSender();
    const shouldShare = active && playerToolVisibility !== "private";
    const payload = {
        type: MEASUREMENT_EVENT_NAME,
        id: measurementSessionId,
        active: shouldShare,
        visibility: playerToolVisibility,
        ...sender
    };
    if(shouldShare)
        payload.points = measurementPoints;

    sendMeasurementUpdate(payload);
}

function removeRemoteMeasurement(id) {
    const measurement = remoteMeasurements.get(id);
    if(measurement)
        map.removeLayer(measurement);
    remoteMeasurements.delete(id);
}

function handleRemoteMeasurement(event) {
    const measurement = event.payload || event.data || JSON.parse(event.newValue || "null");
    if(
        !measurement ||
        measurement.type !== MEASUREMENT_EVENT_NAME ||
        typeof measurement.id !== "string" ||
        measurement.id === measurementSessionId
    )
        return;

    if(!measurement.active) {
        removeRemoteMeasurement(measurement.id);
        return;
    }

    const validSender = measurement.role === "gm" && measurement.name === "GM" ||
        measurement.role === "player" &&
            typeof measurement.name === "string" &&
            Object.prototype.hasOwnProperty.call(CONFIG.players, measurement.name) ||
        measurement.role === "guest" && measurement.name === null;
    if(
        !validSender ||
        !Array.isArray(measurement.points) ||
        measurement.points.some(point =>
            !Array.isArray(point) ||
            point.length !== 2 ||
            !Number.isFinite(point[0]) ||
            !Number.isFinite(point[1])
        )
    )
        return;

    if(!isPlayerToolVisibleToCurrentUser(measurement)) {
        removeRemoteMeasurement(measurement.id);
        return;
    }

    removeRemoteMeasurement(measurement.id);
    const group = L.layerGroup();
    const line = L.polyline(measurement.points, {
        color: "#b22222",
        weight: 3,
        dashArray: "8 6",
        interactive: false
    }).addTo(group);
    measurement.points.forEach(point => {
        L.circleMarker(point, {
            radius: 4,
            color: "#7f1d1d",
            weight: 2,
            fillColor: "#f7e7ce",
            fillOpacity: 1,
            interactive: false
        }).addTo(group);
    });
    if(measurement.points.length > 1) {
        line.bindTooltip(getMeasurementReadoutContent(measurement.points), {
            permanent: true,
            direction: "center",
            className: "measure-readout"
        });
    }
    group.addTo(map);
    if(measurement.points.length > 1)
        line.openTooltip();
    remoteMeasurements.set(measurement.id, group);
}

function clearMeasurement() {
    const hadMeasurement = measurementPoints.length > 0;
    if(measurementLine)
        map.removeLayer(measurementLine);

    measurementMarkers.forEach(marker => map.removeLayer(marker));
    measurementLine = null;
    measurementMarkers = [];
    measurementPoints = [];
    measurementFinished = false;

    if(measureReadout)
        measureReadout.style.display = "none";
    if(hadMeasurement)
        publishMeasurement(false);
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
        publishMeasurement(true);
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
    publishMeasurement(measurementPoints.length > 0);
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
    updatePlayerToolVisibilityButton();
}

function updatePlayerToolVisibilityButton() {
    const stage = PLAYER_TOOL_VISIBILITY_STAGES.find(item => item.value === playerToolVisibility);
    playerToolVisibilityButton.textContent = stage.label;
    playerToolVisibilityButton.setAttribute("aria-label", `Show to others: ${stage.label}`);
    playerToolVisibilityButton.dataset.visibility = stage.value;
}

// Update player status display
function updatePlayerStatus() {
    playerToolsToggle.style.color = isGM
        ? CONFIG.gmColor
        : currentPlayer
            ? CONFIG.players[currentPlayer] || "#808080"
            : "#808080";

    if(isGM) {
        playerStatusDisplay.textContent = "GM";
        playerStatusDisplay.style.color = CONFIG.gmColor;
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

playerToolVisibilityButton.addEventListener("click", function(e) {
    e.stopPropagation();
    const currentIndex = PLAYER_TOOL_VISIBILITY_STAGES.findIndex(
        stage => stage.value === playerToolVisibility
    );
    playerToolVisibility = PLAYER_TOOL_VISIBILITY_STAGES[
        (currentIndex + 1) % PLAYER_TOOL_VISIBILITY_STAGES.length
    ].value;
    localStorage.setItem(PLAYER_TOOL_VISIBILITY_KEY, playerToolVisibility);
    updatePlayerToolVisibilityButton();
    if(measurementPoints.length > 0)
        publishMeasurement(true);
    updateLaserPointerVisibility();
});

laserTool.addEventListener("click", function(e) {
    e.stopPropagation();
    toggleLaserPointer();
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
