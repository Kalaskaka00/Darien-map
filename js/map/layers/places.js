const placePinStyles = {
    arcane: {
        label: "Arcane",
        color: "#2878d0",
        textColor: "#fff",
        symbol: '<path d="m12 2.5 2.9 6 6.6 1-4.8 4.7 1.1 6.6-5.8-3.1-5.8 3.1 1.1-6.6-4.8-4.7 6.6-1z" fill="currentColor"/>'
    },
    divine: {
        label: "Divine",
        color: "#d6a900",
        textColor: "#2d2417",
        symbol: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1m0-14.2L17 7M7 17l-2.1 2.1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/>'
    },
    landmark: {
        label: "Landmark",
        color: "#e87922",
        textColor: "#2d2417",
        symbol: '<path d="m2.5 19 7-12 4.2 7 2.5-4 5.3 9z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="m7.4 10.6 2.2 2.2 2.1-2.1" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"/>'
    },
    ruin: {
        label: "Ruin",
        color: "#858585",
        textColor: "#fff",
        symbol: '<path d="m5 6 3-2 3 2 3-2 5 2v3H5zm2 3v10m5-10v10m5-10v10M5 20h14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>'
    }
};

function getPlaceTypeKeys(place) {
    const typeValues = Array.isArray(place.type) ? place.type : [place.type];
    const typeKeys = [...new Set(typeValues
        .filter(type => typeof type === "string")
        .map(type => type.trim().toLowerCase())
        .filter(Boolean))];

    if(typeKeys.length < 1 || typeKeys.length > 2) {
        console.warn(`Place "${place.name}" must have one or two types and will not be shown.`);
        return null;
    }

    if(typeKeys.some(type => !placePinStyles[type])) {
        console.warn(`Place "${place.name}" has an unsupported type and will not be shown.`);
        return null;
    }

    return typeKeys;
}

function createPlacePinIcon(styles) {
    const circle = styles.length === 1
        ? `<circle cx="20" cy="19" r="16" fill="${styles[0].color}"/>`
        : `
            <path d="M20 3 A16 16 0 0 0 20 35 L20 3 Z" fill="${styles[0].color}"/>
            <path d="M20 3 A16 16 0 0 1 20 35 L20 3 Z" fill="${styles[1].color}"/>
        `;
    const symbols = styles.length === 1
        ? `<svg x="11" y="10" width="18" height="18" viewBox="0 0 24 24">${styles[0].symbol}</svg>`
        : styles.map((style, index) =>
            `<svg x="${index === 0 ? 6 : 22}" y="13" width="12" height="12" viewBox="0 0 24 24">${style.symbol}</svg>`
        ).join("");
    const divider = styles.length === 2
        ? '<path d="M20 3v32" fill="none" stroke="#fff7df" stroke-width="1.5"/>'
        : "";
    const needleColor = styles.length === 1 ? styles[0].color : "#6f5328";

    return L.divIcon({
        className: "place-pin-marker",
        html: `<svg class="place-pin-icon" viewBox="0 0 40 54" aria-hidden="true"><path d="M12 29 20 52 28 29 Z" fill="${needleColor}" stroke="#fff7df" stroke-width="2.5" stroke-linejoin="round"/>${circle}<circle cx="20" cy="19" r="16" fill="none" stroke="#fff7df" stroke-width="2.5"/>${divider}<g fill="#fff7df" stroke="#fff7df" style="color:#fff7df">${symbols}</g></svg>`,
        iconSize: [40, 54],
        iconAnchor: [20, 52],
        tooltipAnchor: [0, -50]
    });
}

function addPlace(place) {
    if(!Number.isFinite(place.map.x) || !Number.isFinite(place.map.y)) {
        console.warn(`Place "${place.name}" has invalid map coordinates and will not be shown.`);
        return;
    }

    const typeKeys = getPlaceTypeKeys(place);
    if(!typeKeys)
        return;

    const styles = typeKeys.map(type => placePinStyles[type]);
    const marker = L.marker([place.map.y, place.map.x], {
        icon: createPlacePinIcon(styles),
        title: place.name,
        keyboard: true,
        zIndexOffset: 1000
    }).addTo(layers.places);

    marker.bindTooltip(place.name, {
        permanent: true,
        direction: "top",
        className: "place-label"
    });
    marker.on("click", event => {
        L.DomEvent.stop(event);
        openArticle(place);
    });

    registerMapObject("places", place.id, marker);
}
