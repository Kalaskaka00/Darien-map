const PLAYER_PRESENCE_ACTIVITY_WARNING_MS = 15 * 60 * 1000;
const PLAYER_PRESENCE_ACTIVITY_STALE_MS = 60 * 60 * 1000;
const PLAYER_PRESENCE_TRACK_INTERVAL_MS = 10000;

const playerPresenceContainer = document.getElementById("player-presence");
const playerPresenceStatus = document.getElementById("player-presence-status");
const playerPresenceList = document.getElementById("player-presence-list");
const playerPresenceSessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let playerPresenceChannel = null;
let playerPresenceChannelStatus = null;
let playerPresenceError = false;
let playerPresenceLastActiveAt = Date.now();
let playerPresenceLastTrackedAt = 0;
let playerPresenceTrackPending = false;
let playerPresenceNeedsTrack = false;

function getPlayerPresenceIdentity() {
    if(isGM)
        return {name: "GM", role: "gm"};
    if(currentPlayer && Object.prototype.hasOwnProperty.call(CONFIG.players, currentPlayer))
        return {name: currentPlayer, role: "player"};
    return null;
}

function getPlayerPresenceActivityStatus(lastActiveAt, now) {
    const inactiveFor = Math.max(0, now - lastActiveAt);
    if(inactiveFor >= PLAYER_PRESENCE_ACTIVITY_STALE_MS)
        return "stale";
    if(inactiveFor >= PLAYER_PRESENCE_ACTIVITY_WARNING_MS)
        return "idle";
    return "active";
}

function renderPlayerPresence() {
    if(!playerPresenceChannel)
        return;
    if(playerPresenceChannelStatus !== "SUBSCRIBED") {
        playerPresenceList.replaceChildren();
        return;
    }

    const now = Date.now();
    const onlineByIdentity = new Map();
    const presenceState = playerPresenceChannel.presenceState();

    Object.values(presenceState).flat().forEach(presence => {
        if(!presence || !Number.isFinite(presence.lastActiveAt) || presence.lastActiveAt <= 0)
            return;

        let identity;
        if(presence.role === "gm" && presence.name === "GM") {
            identity = "gm";
        } else if(
            presence.role === "player" &&
            typeof presence.name === "string" &&
            Object.prototype.hasOwnProperty.call(CONFIG.players, presence.name)
        ) {
            identity = `player:${presence.name}`;
        } else {
            return;
        }

        const existing = onlineByIdentity.get(identity);
        if(!existing || presence.lastActiveAt > existing.lastActiveAt)
            onlineByIdentity.set(identity, presence);
    });

    const onlinePlayers = Array.from(onlineByIdentity.values()).sort((first, second) => {
        if(first.role !== second.role)
            return first.role === "gm" ? -1 : 1;
        return first.name.localeCompare(second.name);
    });

    playerPresenceList.replaceChildren();
    onlinePlayers.forEach(presence => {
        const status = getPlayerPresenceActivityStatus(presence.lastActiveAt, now);
        const item = document.createElement("li");
        item.className = `player-presence-item player-presence-${status}`;

        const indicator = document.createElement("span");
        indicator.className = "player-presence-indicator";
        indicator.setAttribute("aria-hidden", "true");

        const name = document.createElement("span");
        name.className = "player-presence-name";
        name.textContent = presence.name;
        name.style.color = presence.role === "gm"
            ? CONFIG.gmColor
            : CONFIG.players[presence.name];

        const activityLabel = status === "active"
            ? "Active within the last 15 minutes"
            : status === "idle"
                ? "Inactive for at least 15 minutes"
                : "Inactive for at least 1 hour";
        item.setAttribute("aria-label", `${presence.name}: ${activityLabel}`);
        item.title = activityLabel;
        item.append(indicator, name);
        playerPresenceList.appendChild(item);
    });
    playerPresenceContainer.hidden = onlinePlayers.length === 0 && !playerPresenceError;

    if(playerPresenceError)
        playerPresenceStatus.textContent = "Could not update live status.";
    else
        playerPresenceStatus.textContent = "";
    playerPresenceContainer.classList.toggle("player-presence-unavailable", playerPresenceError);
}

function setPlayerPresenceConnectionStatus(status) {
    playerPresenceChannelStatus = status;
    if(status === "SUBSCRIBED") {
        playerPresenceLastTrackedAt = 0;
        playerPresenceError = false;
        renderPlayerPresence();
        trackPlayerPresence();
    } else {
        playerPresenceError = true;
        playerPresenceStatus.textContent = "Live status unavailable.";
        playerPresenceContainer.hidden = false;
        playerPresenceContainer.classList.add("player-presence-unavailable");
        renderPlayerPresence();
        if(status !== "CLOSED")
            console.warn("Player presence realtime status:", status);
    }
}

function trackPlayerPresence() {
    if(!playerPresenceChannel || playerPresenceChannelStatus !== "SUBSCRIBED")
        return;
    if(playerPresenceTrackPending) {
        playerPresenceNeedsTrack = true;
        return;
    }
    if(Date.now() - playerPresenceLastTrackedAt < PLAYER_PRESENCE_TRACK_INTERVAL_MS)
        return;

    const identity = getPlayerPresenceIdentity();
    if(!identity)
        return;

    playerPresenceTrackPending = true;
    playerPresenceNeedsTrack = false;
    const trackedAt = Date.now();
    playerPresenceChannel.track({
        ...identity,
        lastActiveAt: playerPresenceLastActiveAt
    }).then(result => {
        if(result !== "ok") {
            console.error("Could not update player presence:", result);
            playerPresenceError = true;
            renderPlayerPresence();
            return;
        }
        playerPresenceError = false;
        playerPresenceLastTrackedAt = trackedAt;
        renderPlayerPresence();
    }).catch(error => {
        console.error("Could not update player presence:", error);
        playerPresenceError = true;
        renderPlayerPresence();
    }).finally(() => {
        playerPresenceTrackPending = false;
        if(playerPresenceNeedsTrack)
            window.setTimeout(trackPlayerPresence, PLAYER_PRESENCE_TRACK_INTERVAL_MS);
    });
}

function recordPlayerPresenceActivity() {
    playerPresenceLastActiveAt = Date.now();
    trackPlayerPresence();
}

function initializePlayerPresence() {
    if(!pingRealtime) {
        playerPresenceStatus.textContent = "Live status unavailable.";
        playerPresenceContainer.hidden = false;
        playerPresenceContainer.classList.add("player-presence-unavailable");
        return;
    }

    const realtimeRoom = CONFIG.map.realtime.room || "darien-map";
    playerPresenceChannel = pingRealtime
        .channel(`${realtimeRoom}-player-presence`, {
            config: {
                presence: {
                    key: playerPresenceSessionId
                }
            }
        })
        .on("presence", {event: "sync"}, renderPlayerPresence);

    playerPresenceChannel.subscribe(setPlayerPresenceConnectionStatus);

    ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"].forEach(eventName => {
        document.addEventListener(eventName, recordPlayerPresenceActivity, {passive: true});
    });

    window.setInterval(renderPlayerPresence, 15000);
}

initializePlayerPresence();
