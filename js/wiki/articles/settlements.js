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

        default:
            console.warn("Okänd ikontyp:", city.map.icon);
            icon = SmallCityIcon;        
    }

    const marker = L.marker([city.map.y, city.map.x], {
        icon: icon,
        draggable: false
})
        .on("click", () => {

        loadArticle(city.file);
        })

        .bindTooltip(city.name, {
            permanent: true,
            direction: "right",
            offset: [15, 0],
            className: "city-label"
        })
        
        .addTo(cityLayer);

        markers[city.id] = marker;

        marker.on("click", function(){

        if(editorMode !== "move-settlement")
        return;

        marker.dragging.enable();

        });

        marker.on("dragend", function(){

    marker.dragging.disable();

    const pos = marker.getLatLng();

    const yaml =
`map:
  x: ${Math.round(pos.lng)}
  y: ${Math.round(pos.lat)}
  icon: ${city.map.icon}`;

    navigator.clipboard.writeText(yaml);

    console.log(yaml);

    alert("Coordinates copied!");

});

};

//Labels Zoom
function updateLabels() {

    cityLayer.eachLayer(layer => {

        if (map.getZoom() >= 1) {
            layer.openTooltip();
        } else {
            layer.closeTooltip();
        }

    });

}

map.on("zoomend", updateLabels);

registerArticleType("settlement",{

    focus: focusArticle,

    onOpen(article){},

    onClose(article){},

    icon:"🏰"

});