const MAP_PIN_TABLE = "darien_map_pins";
const MAP_PIN_ID_PREFIX = "pin";
const mapPinTool = document.getElementById("map-pin-tool");
const mapPinRetry = document.getElementById("map-pin-retry");
const mapPinStatus = document.getElementById("map-pin-status");
const mapPinGroups = new Map();
const mapPinSupabase = typeof pingRealtime !== "undefined" ? pingRealtime : null;
let mapPinAdding = false;
let mapPinLoadError = false;
let mapPinRefreshPromise = Promise.resolve();

function setMapPinError(message) {
    mapPinStatus.textContent = message;
    mapPinStatus.hidden = !message;
    mapPinTool.classList.toggle("has-error", Boolean(message));
}

function getMapPinIdentity() {
    if(isGM)
        return {role: "gm", name: "GM"};
    if(currentPlayer && Object.prototype.hasOwnProperty.call(CONFIG.players, currentPlayer))
        return {role: "player", name: currentPlayer};
    return {role: "guest", name: null};
}

function getMapPinLayerKey(pin) {
    if(pin.visibility === "public")
        return "pinsPublic";
    if(pin.owner_role === "gm")
        return "pinsGm";
    return `pinsPlayer:${pin.owner_name}`;
}

function canViewMapPin(pin) {
    if(pin.visibility === "public")
        return true;
    if(isGM)
        return true;
    return pin.visibility === "private" &&
        pin.owner_role === "player" &&
        pin.owner_name === currentPlayer;
}

function canEditMapPin(pin) {
    if(pin.visibility === "public")
        return true;
    if(isGM)
        return true;
    return pin.visibility === "private" &&
        pin.owner_role === "player" &&
        pin.owner_name === currentPlayer;
}

function isValidMapPin(pin) {
    return pin &&
        typeof pin.id === "string" &&
        typeof pin.title === "string" &&
        typeof pin.notes === "string" &&
        Number.isFinite(pin.lat) &&
        Number.isFinite(pin.lng) &&
        (pin.visibility === "public" || pin.visibility === "private") &&
        (
            pin.owner_role === "gm" && pin.owner_name === "GM" ||
            pin.owner_role === "player" &&
                typeof pin.owner_name === "string" &&
                Object.prototype.hasOwnProperty.call(CONFIG.players, pin.owner_name) ||
            pin.owner_role === "guest" && pin.owner_name === null
        );
}

function getMapPinColor(pin) {
    if(pin.visibility === "public")
        return "#2878d0";
    if(pin.owner_role === "gm")
        return CONFIG.gmColor;
    return CONFIG.players[pin.owner_name] || "#808080";
}

function getMapPinLayer(pin) {
    return mapPinGroups.get(getMapPinLayerKey(pin));
}

function createMapPinIcon(pin) {
    const color = /^#[0-9a-f]{6}$/i.test(getMapPinColor(pin))
        ? getMapPinColor(pin)
        : "#808080";

    return L.divIcon({
        className: "map-pin-marker",
        html: `<span class="map-pin-dot" style="--map-pin-color: ${color};"></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 20]
    });
}

function createMapPinButton(label, handler, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = className;
    button.addEventListener("click", handler);
    return button;
}

function openMapPinPopup(pin, latlng, creating = false) {
    const content = document.createElement("div");
    content.className = "map-pin-popup";

    if(!creating) {
        const title = document.createElement("h3");
        title.textContent = pin.title;
        const notes = document.createElement("p");
        notes.textContent = pin.notes || "No notes.";
        const owner = document.createElement("p");
        owner.textContent = pin.visibility === "public"
            ? "Public pin"
            : `${pin.owner_name}'s private pin`;
        content.append(title, notes, owner);

        if(!canEditMapPin(pin)) {
            L.popup().setLatLng(latlng).setContent(content).openOn(map);
            return;
        }

        const actions = document.createElement("div");
        actions.className = "map-pin-popup-actions";
        actions.append(
            createMapPinButton("Edit", () => openMapPinPopup(pin, latlng, true)),
            createMapPinButton("Delete", () => deleteMapPin(pin))
        );
        content.append(actions);
        L.popup().setLatLng(latlng).setContent(content).openOn(map);
        return;
    }

    const heading = document.createElement("h3");
    heading.textContent = pin ? "Edit map pin" : "New map pin";
    const titleLabel = document.createElement("label");
    titleLabel.textContent = "Title";
    const titleInput = document.createElement("input");
    titleInput.maxLength = 120;
    titleInput.required = true;
    titleInput.value = pin?.title || "";
    titleLabel.append(titleInput);

    const notesLabel = document.createElement("label");
    notesLabel.textContent = "Notes";
    const notesInput = document.createElement("textarea");
    notesInput.maxLength = 5000;
    notesInput.value = pin?.notes || "";
    notesLabel.append(notesInput);

    let visibilityLabel;
    let visibilitySelect;
    if(!pin) {
        visibilityLabel = document.createElement("label");
        visibilityLabel.textContent = "Pin visibility";
        visibilitySelect = document.createElement("select");
        visibilitySelect.id = "map-pin-visibility";
        visibilitySelect.append(
            new Option("Public", "public"),
            new Option("Private", "private")
        );
        visibilitySelect.querySelector('[value="private"]').disabled =
            getMapPinIdentity().role === "guest";
        visibilityLabel.append(visibilitySelect);
    }

    const actions = document.createElement("div");
    actions.className = "map-pin-popup-actions";
    const status = document.createElement("p");
    status.className = "map-pin-popup-status";
    status.setAttribute("role", "status");
    status.hidden = true;
    const cancel = createMapPinButton("Cancel", () => {
        map.closePopup();
        if(creating)
            setMapPinAdding(false);
    });
    const save = createMapPinButton("Save", async () => {
        const cleanTitle = titleInput.value.trim();
        if(!cleanTitle) {
            status.textContent = "Enter a title for this pin.";
            status.hidden = false;
            titleInput.focus();
            return;
        }

        save.disabled = true;
        cancel.disabled = true;
        status.hidden = true;
        try {
            if(pin) {
                await updateMapPin(pin, {
                    title: cleanTitle,
                    notes: notesInput.value.trim()
                });
            } else {
                await createMapPin(latlng, {
                    title: cleanTitle,
                    notes: notesInput.value.trim(),
                    visibility: visibilitySelect.value
                });
            }
            map.closePopup();
            if(creating)
                setMapPinAdding(false);
        } catch(error) {
            console.error("Could not save map pin:", error);
            setMapPinError("Could not save this pin. Please try again.");
            save.disabled = false;
            cancel.disabled = false;
        }
    });
    actions.append(cancel, save);
    content.append(heading, titleLabel, notesLabel);
    if(visibilityLabel)
        content.append(visibilityLabel);
    content.append(actions, status);
    L.popup({minWidth: 220}).setLatLng(latlng).setContent(content).openOn(map);
    titleInput.focus();
}

function renderMapPins(pins) {
    mapPinGroups.forEach(group => group.clearLayers());

    pins.forEach(pin => {
        if(!isValidMapPin(pin) || !canViewMapPin(pin))
            return;

        const group = getMapPinLayer(pin);
        if(!group)
            return;

        const marker = L.marker([pin.lat, pin.lng], {
            icon: createMapPinIcon(pin),
            title: pin.title,
            keyboard: true
        });
        marker.on("click", event => {
            L.DomEvent.stop(event);
            openMapPinPopup(pin, marker.getLatLng());
        });
        marker.addTo(group);
    });
}

async function fetchMapPins() {
    if(!mapPinSupabase)
        throw new Error("Supabase is not configured for map pin storage.");

    let request = mapPinSupabase
        .from(MAP_PIN_TABLE)
        .select("id,lat,lng,title,notes,visibility,owner_role,owner_name");
    if(!isGM && currentPlayer) {
        request = request.or(
            `visibility.eq.public,and(visibility.eq.private,owner_role.eq.player,owner_name.eq.${currentPlayer})`
        );
    } else if(!isGM) {
        request = request.eq("visibility", "public");
    }

    const {data, error} = await request;
    if(error)
        throw error;

    return data || [];
}

function refreshMapPins() {
    mapPinRefreshPromise = mapPinRefreshPromise
        .catch(() => undefined)
        .then(async () => {
            const pins = await fetchMapPins();
            renderMapPins(pins);
            mapPinLoadError = false;
            setMapPinError("");
            mapPinRetry.hidden = true;
        })
        .catch(error => {
            console.error("Could not load map pins:", error);
            mapPinLoadError = true;
            setMapPinError("Map pins could not be loaded. Check Supabase setup and retry.");
            mapPinRetry.hidden = false;
        });
    return mapPinRefreshPromise;
}

async function createMapPin(latlng, values) {
    const identity = getMapPinIdentity();
    const visibility = values.visibility;
    if(visibility !== "public" && visibility !== "private")
        throw new Error("Choose whether this map pin is public or private.");
    if(visibility === "private" && identity.role === "guest")
        throw new Error("Select a player or GM before creating a private pin.");

    const pin = {
        id: `${MAP_PIN_ID_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        lat: latlng.lat,
        lng: latlng.lng,
        title: values.title,
        notes: values.notes,
        visibility,
        owner_role: identity.role,
        owner_name: identity.name
    };
    const {error} = await mapPinSupabase.from(MAP_PIN_TABLE).insert(pin);
    if(error)
        throw error;

    await refreshMapPins();
}

async function updateMapPin(pin, values) {
    if(!canEditMapPin(pin))
        throw new Error("You cannot edit this map pin.");

    const {error} = await mapPinSupabase
        .from(MAP_PIN_TABLE)
        .update(values)
        .eq("id", pin.id);
    if(error)
        throw error;

    await refreshMapPins();
}

async function deleteMapPin(pin) {
    if(!canEditMapPin(pin))
        return;
    if(!window.confirm(`Delete "${pin.title}"?`))
        return;

    const {error} = await mapPinSupabase
        .from(MAP_PIN_TABLE)
        .delete()
        .eq("id", pin.id);
    if(error) {
        console.error("Could not delete map pin:", error);
        setMapPinError("Could not delete this pin.");
        return;
    }
    map.closePopup();
    await refreshMapPins();
}

function setMapPinAdding(active) {
    if(active && document.getElementById("measure-tool").classList.contains("active"))
        document.getElementById("measure-tool").click();

    mapPinAdding = active;
    mapPinTool.classList.toggle("active", active);
    mapPinTool.setAttribute("aria-pressed", String(active));
    map.getContainer().classList.toggle("map-pin-adding", active);
    if(active)
        map.on("click", handleMapPinPlacement);
    else
        map.off("click", handleMapPinPlacement);
}

function handleMapPinPlacement(event) {
    if(!mapPinAdding)
        return;
    L.DomEvent.stop(event);
    openMapPinPopup(null, event.latlng, true);
}

function initializeMapPins() {
    const identity = getMapPinIdentity();
    const layerDefinitions = [["pinsPublic", "Public pins"]];
    if(isGM)
        layerDefinitions.push(["pinsGm", "GM pins"]);
    if(isGM) {
        Object.keys(CONFIG.players).forEach(name => {
            layerDefinitions.push([`pinsPlayer:${name}`, `${name} pins`]);
        });
    } else if(identity.role === "player") {
        layerDefinitions.push([`pinsPlayer:${identity.name}`, `${identity.name} pins`]);
    }

    layerDefinitions.forEach(([key, label]) => {
        const group = registerLayer(key, label);
        mapPinGroups.set(key, group);
    });

    mapPinTool.addEventListener("click", () => setMapPinAdding(!mapPinAdding));
    map.on("popupclose", () => {
        if(mapPinAdding)
            setMapPinAdding(false);
    });

    refreshMapPins();

    if(mapPinSupabase) {
        mapPinSupabase
            .channel(`${CONFIG.map.realtime.room || "darien-map"}-map-pins`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: MAP_PIN_TABLE
            }, refreshMapPins)
            .subscribe(status => {
                if(status !== "SUBSCRIBED")
                    console.warn("Map pin realtime status:", status);
            });
    }

    mapPinRetry.addEventListener("click", () => {
        if(mapPinLoadError)
            refreshMapPins();
    });
}
