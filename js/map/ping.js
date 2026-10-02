const PING_HOLD_TIME = 1000;
const PING_MOVE_TOLERANCE = 8;
const PING_DURATION = 1600;
const PING_FALLBACK_CHANNEL_NAME = "darien-map-pings";
const PING_EVENT_NAME = "ping";
const LASER_EVENT_NAME = "laser-pointer";
const LASER_FALLBACK_KEY = "darien-map-laser-pointer";
const LASER_UPDATE_INTERVAL = 32;

let pingHoldTimer = null;
let pingHoldStart = null;
let pingChannel = null;
let pingRealtime = null;
let laserActive = false;
let laserVisible = false;
let laserMarker = null;
let laserUpdateTimer = null;
let pendingLaserPosition = null;
const laserSessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const remoteLaserMarkers = new Map();

function getPingColor() {
    if(isGM)
        return CONFIG.gmColor;

    return CONFIG.players[currentPlayer] || "#2d2417";
}

function showPing(latlng, color) {
    const ping = L.marker(latlng, {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
            className: "ping-marker",
            html: `<span class="ping-wave" style="--ping-color: ${color};"></span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
        })
    }).addTo(map);

    window.setTimeout(() => map.removeLayer(ping), PING_DURATION);
}

function publishPing(latlng) {
    const ping = {
        type: PING_EVENT_NAME,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        lat: latlng.lat,
        lng: latlng.lng,
        color: getPingColor()
    };

    showPing(latlng, ping.color);

    if(pingRealtime) {
        pingChannel.send({
            type: "broadcast",
            event: PING_EVENT_NAME,
            payload: ping
        });
        return;
    }

    if(pingChannel) {
        pingChannel.postMessage(ping);
        return;
    }

    localStorage.setItem(PING_FALLBACK_CHANNEL_NAME, JSON.stringify(ping));
}

function handleRemotePing(event) {
    const ping = event.payload || event.data || JSON.parse(event.newValue || "null");
    if(!ping || (ping.type && ping.type !== PING_EVENT_NAME) || typeof ping.lat !== "number" || typeof ping.lng !== "number")
        return;

    showPing({lat: ping.lat, lng: ping.lng}, ping.color || "#2d2417");
}

function getLaserColor() {
    return isGM ? CONFIG.gmColor : CONFIG.players[currentPlayer] || "#2d2417";
}

function removeRemoteLaser(id) {
    const marker = remoteLaserMarkers.get(id);
    if(marker)
        map.removeLayer(marker);
    remoteLaserMarkers.delete(id);
}

function showLaserPointer(laser) {
    if(!laser.active) {
        removeRemoteLaser(laser.id);
        return;
    }

    let marker = remoteLaserMarkers.get(laser.id);
    if(!marker) {
        marker = L.marker([laser.lat, laser.lng], {
            interactive: false,
            keyboard: false,
            icon: L.divIcon({
                className: "laser-pointer-marker",
                html: `<span class="laser-pointer-light" style="--laser-color: ${laser.color};"></span>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0]
            })
        }).addTo(map);
        remoteLaserMarkers.set(laser.id, marker);
    } else {
        marker.setLatLng([laser.lat, laser.lng]);
    }
}

function handleRemoteLaser(event) {
    const laser = event.payload || event.data || JSON.parse(event.newValue || "null");
    if(!laser || (laser.type && laser.type !== LASER_EVENT_NAME) || laser.id === laserSessionId)
        return;

    if(!laser.active) {
        removeRemoteLaser(laser.id);
        return;
    }

    if(typeof laser.lat !== "number" || typeof laser.lng !== "number")
        return;

    showLaserPointer(laser);
}

function publishLaserPointer(active, latlng) {
    const laser = {
        type: LASER_EVENT_NAME,
        id: laserSessionId,
        active,
        lat: latlng?.lat,
        lng: latlng?.lng,
        color: getLaserColor()
    };

    if(!active) {
        delete laser.lat;
        delete laser.lng;
    }

    if(pingRealtime) {
        pingChannel.send({type: "broadcast", event: LASER_EVENT_NAME, payload: laser});
    } else if(pingChannel) {
        pingChannel.postMessage(laser);
    } else {
        localStorage.setItem(LASER_FALLBACK_KEY, JSON.stringify(laser));
    }
}

function updateLaserPointer(latlng) {
    if(!laserActive || !laserVisible)
        return;

    if(laserMarker)
        laserMarker.setLatLng(latlng);
    else {
        laserMarker = L.marker(latlng, {
            interactive: false,
            keyboard: false,
            icon: L.divIcon({
                className: "laser-pointer-marker",
                html: `<span class="laser-pointer-light" style="--laser-color: ${getLaserColor()};"></span>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0]
            })
        }).addTo(map);
    }

    pendingLaserPosition = latlng;
    if(laserUpdateTimer)
        return;

    publishPendingLaserPosition();
    laserUpdateTimer = window.setTimeout(flushPendingLaserPosition, LASER_UPDATE_INTERVAL);
}

function publishPendingLaserPosition() {
    if(!pendingLaserPosition || !laserActive || !laserVisible)
        return;

    publishLaserPointer(true, pendingLaserPosition);
    pendingLaserPosition = null;
}

function flushPendingLaserPosition() {
    laserUpdateTimer = null;
    if(!pendingLaserPosition || !laserActive || !laserVisible)
        return;

    publishPendingLaserPosition();
    laserUpdateTimer = window.setTimeout(flushPendingLaserPosition, LASER_UPDATE_INTERVAL);
}

function hideLaserPointer() {
    laserVisible = false;
    window.clearTimeout(laserUpdateTimer);
    laserUpdateTimer = null;
    pendingLaserPosition = null;
    if(laserMarker) {
        map.removeLayer(laserMarker);
        laserMarker = null;
    }

    if(laserActive)
        publishLaserPointer(false);
}

function showLaserPointerAt(latlng) {
    if(!laserActive)
        return;

    laserVisible = true;
    updateLaserPointer(latlng);
}

function toggleLaserPointer() {
    laserActive = !laserActive;
    laserTool.classList.toggle("active", laserActive);
    laserTool.setAttribute("aria-pressed", String(laserActive));
    map.getContainer().classList.toggle("laser-pointer-active", laserActive);

    if(laserActive) {
        laserVisible = true;
        publishLaserPointer(true);
    } else {
        hideLaserPointer();
        publishLaserPointer(false);
    }
}

function handleLaserMapMove(event) {
    updateLaserPointer(event.latlng);
}

function cancelPingHold() {
    if(pingHoldTimer) {
        window.clearTimeout(pingHoldTimer);
        pingHoldTimer = null;
    }

    pingHoldStart = null;
}

function startPingHold(event) {
    const originalEvent = event.originalEvent;
    if(!originalEvent || originalEvent.button !== 0 || isMeasureToolActive())
        return;

    cancelPingHold();
    pingHoldStart = {
        x: originalEvent.clientX,
        y: originalEvent.clientY
    };
    pingHoldTimer = window.setTimeout(() => {
        if(!pingHoldStart)
            return;

        publishPing(event.latlng);
        pingHoldTimer = null;
    }, PING_HOLD_TIME);
}

function cancelPingOnMove(event) {
    if(!pingHoldStart || typeof event.clientX !== "number")
        return;

    const distance = Math.hypot(
        event.clientX - pingHoldStart.x,
        event.clientY - pingHoldStart.y
    );
    if(distance > PING_MOVE_TOLERANCE)
        cancelPingHold();
}

function initializePing() {
    const realtimeConfig = CONFIG.map.realtime;
    if(window.supabase && realtimeConfig?.url && realtimeConfig?.key) {
        pingRealtime = window.supabase.createClient(
            realtimeConfig.url,
            realtimeConfig.key
        );
        pingChannel = pingRealtime
            .channel(realtimeConfig.room || "darien-map")
            .on("broadcast", {event: PING_EVENT_NAME}, handleRemotePing)
            .on("broadcast", {event: LASER_EVENT_NAME}, handleRemoteLaser);
        pingChannel.subscribe(status => {
            if(status !== "SUBSCRIBED")
                console.warn("Ping realtime status:", status);
        });
    } else if("BroadcastChannel" in window) {
        pingChannel = new BroadcastChannel(PING_FALLBACK_CHANNEL_NAME);
        pingChannel.addEventListener("message", event => {
            handleRemotePing(event);
            handleRemoteLaser(event);
        });
    } else {
        window.addEventListener("storage", event => {
            if(event.key === PING_FALLBACK_CHANNEL_NAME)
                handleRemotePing(event);
            if(event.key === LASER_FALLBACK_KEY)
                handleRemoteLaser(event);
        });
    }

    map.getContainer().addEventListener("mousedown", event => {
        startPingHold({
            originalEvent: event,
            containerPoint: map.mouseEventToContainerPoint(event),
            latlng: map.mouseEventToLatLng(event)
        });
    });
    map.on("mousemove", handleLaserMapMove);
    map.on("mouseover", event => showLaserPointerAt(event.latlng));
    map.on("mouseout", hideLaserPointer);
    document.addEventListener("mousemove", cancelPingOnMove);
    document.addEventListener("mouseup", cancelPingHold);
}

initializePing();
