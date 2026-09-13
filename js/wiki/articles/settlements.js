const CastleIcon = L.icon({
    iconUrl: 'icons/Castle.png',
    iconSize: [40, 32],
    iconAnchor: [20, 16],
    popupAnchor: [0, -16]
});

const KeepIcon = L.icon({
    iconUrl: 'icons/Keep.png',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

const LargeCityStoneWallTowersIcon = L.icon({
    iconUrl: 'icons/Large_City_Stone_Wall_Towers.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const LargeCityIcon = L.icon({
    iconUrl: 'icons/Large_City.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const SmallCityIcon = L.icon({
    iconUrl: 'icons/Small_City.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const SmallCityStoneWallTowersIcon = L.icon({
    iconUrl: 'icons/Small_City_Stone_Wall_Towers.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const TownIcon = L.icon({
    iconUrl: 'icons/Town.png',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

const VillageWoodWallIcon = L.icon({
    iconUrl: 'icons/Village_Wood_Wall.png',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

function addCity(city) {

    let icon;

    switch(city.map.icon){

            case "Castle":
            icon = CastleIcon;
            break;

        case "Keep":
            icon = KeepIcon;
            break;

        case "Large_City_Stone_Wall_Towers":
            icon = LargeCityStoneWallTowersIcon;
            break;

                case "Large_City":
        icon = LargeCityIcon;
        break;

        case "Small_City_Stone_Wall_Towers":
            icon = SmallCityStoneWallTowersIcon;
            break;

        case "Small_City":
            icon = SmallCityIcon;
            break;

            
        case "Town":
            icon = TownIcon;
            break;

        case "Village_Wood_Wall":
            icon = VillageWoodWallIcon;
            break;

        default:
            console.warn("Okänd ikontyp:", city.map.icon);
            icon = SmallCityIcon;        
    }

    const marker = L.marker([city.map.y, city.map.x], {
    icon: icon,
    draggable: false
})
.bindTooltip(city.name, {
    permanent: true,
    direction: "right",
    offset: [15, 0],
    className: "city-label"
})
.addTo(layers.settlements);

// Registrera markören
registerMapObject(
    "settlements",
    city.id,
    marker
);

marker.on("click", function(e){

    if(editorMode === "move-settlement"){

        selectSettlementForMoving(city, marker);

        return;

    }

    if(isMeasureToolActive()){

        L.DomEvent.stop(e);
        addMeasurementPointAt(city.map.y, city.map.x);

        return;

    }

    // If a drawing tool is active, snap to this settlement's coordinates
    if(isLineDrawingActive()){

        L.DomEvent.stopPropagation(e);

        // Try to add point to the active drawing tool
        const added = addPointToLineDrawing(city.map.y, city.map.x) || 
                      addPointToPolygonDrawing(city.map.y, city.map.x);

        return;

    }

    openArticle(city);

});
}

//Labels Zoom
function updateLabels() {

    layers.settlements.eachLayer(layer => {

        if (map.getZoom() >= 1) {
            layer.openTooltip();
        } else {
            layer.closeTooltip();
        }

    });

}

function getSettlementNation(article){

    if(!article.nation)
        return null;

    const nationName = String(article.nation)
        .replace(/^\[\[|\]\]$/g, "");

    return getArticle(nationName);

}

function getSettlementIcon(article){

    const indexedArticle = getArticleByFile(article.file);
    const icon = article.map?.icon || indexedArticle?.map?.icon;

    if(!icon)
        return "";

    const escapedIcon = String(icon)
        .replace(/[^a-zA-Z0-9_-]/g, "");

    return `
        <img
            class="settlement-icon"
            src="icons/${escapedIcon}.png"
            alt=""
        >
    `;

}

function buildSettlementCard(article, compact = false){

    const nation = getSettlementNation(article);
    const color = nation?.color || "#4b4b4b";
    const nationRow = article.nation
        ? sidebarRow("Nation", article.nation)
        : "";
    const isCapital = article.capital === true ||
        String(article.capital).toLowerCase() === "true";
    const title = isCapital
        ? `★ ${escapeArticleHTML(article.name)} ★`
        : escapeArticleHTML(article.name);

    return `
        <section class="settlement-card${compact ? " settlement-card-compact" : ""}" style="--settlement-color:${color};">
            <header class="settlement-banner">
                <span>${title}</span>
            </header>
            <div class="settlement-content">
                <div class="settlement-icon-container">
                    ${getSettlementIcon(article)}
                </div>
                <div class="settlement-details">
                    ${nationRow}
                    ${sidebarRow("Ruler", article.Ruler || article.ruler)}
                </div>
            </div>
        </section>
    `;

}

map.on("zoomend", updateLabels);

registerArticleType("settlement",{

    sidebar(article){

        return buildSettlementCard(article);

    },

    preview(article){

        return buildSettlementCard(article, true);

    },

    focus: focusArticle,

    onOpen(article){},

    onClose(article){},

    icon:"🏰"

});