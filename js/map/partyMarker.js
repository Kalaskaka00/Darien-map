const PARTY_MARKER_TABLE = "darien_party_marker";
const PARTY_MARKER_ID = true;
const PARTY_MARKER_HEARTBEAT_MS = 10000;
const PARTY_MARKER_HISTORY_LIMIT = 10;
const partyMarkerStatus = document.getElementById("party-marker-status");
const partyMarkerPrevious = document.getElementById("party-marker-previous");
const partyMarkerNext = document.getElementById("party-marker-next");
let partyMarkerState = null;
let partyMarker = null;
let partyMarkerLockId = null;
let partyMarkerLockPending = false;
let partyMarkerDragging = false;
let partyMarkerDragEnded = false;
let partyMarkerFinishing = false;
let partyMarkerHeartbeat = null;
let partyMarkerRefreshPromise = Promise.resolve();

function setPartyMarkerStatus(message, isError = false) {
    partyMarkerStatus.textContent = message;
    partyMarkerStatus.classList.toggle("has-error", isError);
}

function isValidPartyMarkerState(state) {
    return state &&
        state.id === PARTY_MARKER_ID &&
        Number.isFinite(state.lat) &&
        Number.isFinite(state.lng) &&
        Array.isArray(state.history) &&
        state.history.length > 0 &&
        state.history.length <= PARTY_MARKER_HISTORY_LIMIT &&
        Number.isInteger(state.history_index) &&
        state.history_index >= 0 &&
        state.history_index < state.history.length &&
        state.history.every(location =>
            location &&
            Number.isFinite(location.lat) &&
            Number.isFinite(location.lng)
        );
}

function isPartyMarkerLockedByAnotherUser() {
    if(!partyMarkerState?.lock_id || partyMarkerState.lock_id === partyMarkerLockId)
        return false;

    const lockExpiry = Date.parse(partyMarkerState.lock_until);
    return !Number.isFinite(lockExpiry) || lockExpiry > Date.now();
}

function updatePartyMarkerControls() {
    const lockedByAnotherUser = isPartyMarkerLockedByAnotherUser();
    partyMarkerPrevious.disabled = !partyMarkerState ||
        partyMarkerState.history_index <= 0 ||
        lockedByAnotherUser ||
        partyMarkerLockPending;
    partyMarkerNext.disabled = !partyMarkerState ||
        partyMarkerState.history_index >= partyMarkerState.history.length - 1 ||
        lockedByAnotherUser ||
        partyMarkerLockPending;

    if(lockedByAnotherUser)
        setPartyMarkerStatus("Someone else is moving the party marker.");
}

function setPartyMarkerDraggable() {
    if(!partyMarker)
        return;

    if(isPartyMarkerLockedByAnotherUser())
        partyMarker.dragging.disable();
    else
        partyMarker.dragging.enable();
}

function renderPartyMarker(state) {
    if(!partyMarker) {
        partyMarker = L.marker([state.lat, state.lng], {
            icon: L.icon({
                iconUrl: "icons/Party_Marker.png",
                iconSize: [48, 48],
                iconAnchor: [24, 44]
            }),
            title: "Current party location",
            alt: "Current party location",
            draggable: true,
            keyboard: true
        }).addTo(map);
        partyMarker.on("dragstart", beginPartyMarkerMove);
        partyMarker.on("dragend", endPartyMarkerMove);
    } else if(!partyMarkerDragging) {
        partyMarker.setLatLng([state.lat, state.lng]);
    }

    setPartyMarkerDraggable();
    updatePartyMarkerControls();
}

async function fetchPartyMarkerState() {
    if(!pingRealtime)
        throw new Error("Supabase is not configured for party marker storage.");

    const {data, error} = await pingRealtime
        .from(PARTY_MARKER_TABLE)
        .select("id,lat,lng,history,history_index,lock_id,lock_until")
        .eq("id", PARTY_MARKER_ID)
        .maybeSingle();
    if(error)
        throw error;
    if(!isValidPartyMarkerState(data))
        throw new Error("Party marker state is missing or invalid.");

    return data;
}

function refreshPartyMarker() {
    partyMarkerRefreshPromise = partyMarkerRefreshPromise
        .catch(() => undefined)
        .then(async () => {
            const state = await fetchPartyMarkerState();
            partyMarkerState = state;
            renderPartyMarker(state);
            if(!isPartyMarkerLockedByAnotherUser() && !partyMarkerLockId)
                setPartyMarkerStatus("Drag the marker to move the party.");
            else if(state.lock_id === partyMarkerLockId)
                setPartyMarkerStatus("You are moving the party marker.");
        })
        .catch(error => {
            console.error("Could not load party marker:", error);
            const missingTable = error?.code === "PGRST205" || error?.code === "42P01";
            setPartyMarkerStatus(missingTable
                ? "The party marker table is missing. Run supabase/migrations/20261112100000_party_marker.sql in Supabase."
                : "Party location could not be loaded. Check Supabase setup and reload.", true);
            partyMarkerPrevious.disabled = true;
            partyMarkerNext.disabled = true;
        });
    return partyMarkerRefreshPromise;
}

function createPartyMarkerLockId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function acquirePartyMarkerLock(lockId) {
    const {data, error} = await pingRealtime.rpc("party_marker_acquire", {
        p_lock_id: lockId
    });
    if(error)
        throw error;
    return data === true;
}

async function releasePartyMarkerLock(lockId) {
    const {data, error} = await pingRealtime.rpc("party_marker_release", {
        p_lock_id: lockId
    });
    if(error)
        throw error;
    if(data !== true)
        throw new Error("The party marker lock could not be released.");
}

function renewPartyMarkerLock() {
    const lockId = partyMarkerLockId;
    if(!lockId)
        return;

    pingRealtime.rpc("party_marker_renew", {p_lock_id: lockId}).then(({data, error}) => {
        if(error)
            throw error;
        if(data !== true)
            throw new Error("The party marker lock expired.");
    }).catch(error => {
        console.error("Could not renew party marker lock:", error);
        window.clearInterval(partyMarkerHeartbeat);
        partyMarkerHeartbeat = null;
        partyMarkerLockId = null;
        partyMarkerDragging = false;
        setPartyMarkerStatus("The move lock was lost. Reloading the party location.", true);
        refreshPartyMarker();
    });
}

async function beginPartyMarkerMove() {
    if(partyMarkerLockId || partyMarkerLockPending || !partyMarkerState)
        return;

    partyMarkerDragging = true;
    partyMarkerLockPending = true;
    partyMarkerDragEnded = false;
    updatePartyMarkerControls();
    const lockId = createPartyMarkerLockId();
    try {
        const acquired = await acquirePartyMarkerLock(lockId);
        if(!acquired) {
            partyMarkerDragging = false;
            await refreshPartyMarker();
            setPartyMarkerStatus("Someone else is moving the party marker.");
            return;
        }

        partyMarkerLockId = lockId;
        partyMarkerState.lock_id = lockId;
        setPartyMarkerStatus("You are moving the party marker.");
        partyMarkerHeartbeat = window.setInterval(
            renewPartyMarkerLock,
            PARTY_MARKER_HEARTBEAT_MS
        );
        if(partyMarkerDragEnded)
            await finishPartyMarkerMove();
    } catch(error) {
        console.error("Could not acquire party marker lock:", error);
        partyMarkerDragging = false;
        setPartyMarkerStatus("Could not lock the party marker. Please try again.", true);
        await refreshPartyMarker();
    } finally {
        partyMarkerLockPending = false;
        updatePartyMarkerControls();
    }
}

async function finishPartyMarkerMove() {
    if(!partyMarkerLockId || partyMarkerFinishing)
        return;

    partyMarkerFinishing = true;
    window.clearInterval(partyMarkerHeartbeat);
    partyMarkerHeartbeat = null;
    const lockId = partyMarkerLockId;
    const location = partyMarker.getLatLng();
    try {
        const {data, error} = await pingRealtime.rpc("party_marker_finish", {
            p_lock_id: lockId,
            p_lat: location.lat,
            p_lng: location.lng
        });
        if(error)
            throw error;
        if(data !== true)
            throw new Error("The party marker move could not be saved.");
        partyMarkerLockId = null;
        partyMarkerDragging = false;
        await refreshPartyMarker();
    } catch(error) {
        console.error("Could not save party marker location:", error);
        try {
            await releasePartyMarkerLock(lockId);
        } catch(releaseError) {
            console.error("Could not release party marker lock:", releaseError);
        }
        partyMarkerLockId = null;
        partyMarkerDragging = false;
        setPartyMarkerStatus("Could not save the party location. Reloading the last saved location.", true);
        await refreshPartyMarker();
    } finally {
        partyMarkerFinishing = false;
    }
}

function endPartyMarkerMove() {
    partyMarkerDragEnded = true;
    if(partyMarkerLockId)
        finishPartyMarkerMove();
}

async function navigatePartyMarkerHistory(direction) {
    if(!partyMarkerState || partyMarkerLockPending || isPartyMarkerLockedByAnotherUser())
        return;

    partyMarkerLockPending = true;
    updatePartyMarkerControls();
    const lockId = createPartyMarkerLockId();
    try {
        if(!await acquirePartyMarkerLock(lockId)) {
            setPartyMarkerStatus("Someone else is moving the party marker.");
            await refreshPartyMarker();
            return;
        }

        const {data, error} = await pingRealtime.rpc("party_marker_navigate", {
            p_lock_id: lockId,
            p_direction: direction
        });
        if(error)
            throw error;
        if(data !== true)
            setPartyMarkerStatus("There is no saved location in that direction.");
        await releasePartyMarkerLock(lockId);
        await refreshPartyMarker();
    } catch(error) {
        console.error("Could not change party marker history:", error);
        try {
            await releasePartyMarkerLock(lockId);
        } catch(releaseError) {
            console.error("Could not release party marker lock:", releaseError);
        }
        setPartyMarkerStatus("Could not change party location history. Please try again.", true);
        await refreshPartyMarker();
    } finally {
        partyMarkerLockPending = false;
        updatePartyMarkerControls();
    }
}

function initializePartyMarker() {
    partyMarkerPrevious.addEventListener("click", () => navigatePartyMarkerHistory(-1));
    partyMarkerNext.addEventListener("click", () => navigatePartyMarkerHistory(1));
    refreshPartyMarker();

    if(pingRealtime) {
        pingRealtime
            .channel(`${CONFIG.map.realtime.room || "darien-map"}-party-marker`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: PARTY_MARKER_TABLE
            }, refreshPartyMarker)
            .subscribe(status => {
                if(status !== "SUBSCRIBED")
                    console.warn("Party marker realtime status:", status);
            });
    }
}
