const PING_HOLD_TIME = 1000;
const PING_MOVE_TOLERANCE = 8;
const PING_DURATION = 1600;
const PING_CHANNEL_NAME = "darien-map-pings";

let pingHoldTimer = null;
let pingHoldStart = null;
let pingChannel = null;

function getPingColor() {
    if(isGM)
        return "#8b0000";

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
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        lat: latlng.lat,
        lng: latlng.lng,
        color: getPingColor()
    };

    showPing(latlng, ping.color);

    if(pingChannel) {
        pingChannel.postMessage(ping);
        return;
    }

    localStorage.setItem(PING_CHANNEL_NAME, JSON.stringify(ping));
}

function handleRemotePing(event) {
    const ping = event.data || JSON.parse(event.newValue || "null");
    if(!ping || typeof ping.lat !== "number" || typeof ping.lng !== "number")
        return;

    showPing({lat: ping.lat, lng: ping.lng}, ping.color || "#2d2417");
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
    if("BroadcastChannel" in window) {
        pingChannel = new BroadcastChannel(PING_CHANNEL_NAME);
        pingChannel.addEventListener("message", handleRemotePing);
    } else {
        window.addEventListener("storage", event => {
            if(event.key === PING_CHANNEL_NAME)
                handleRemotePing(event);
        });
    }

    map.getContainer().addEventListener("mousedown", event => {
        startPingHold({
            originalEvent: event,
            containerPoint: map.mouseEventToContainerPoint(event),
            latlng: map.mouseEventToLatLng(event)
        });
    });
    document.addEventListener("mousemove", cancelPingOnMove);
    document.addEventListener("mouseup", cancelPingHold);
}

initializePing();
