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


// Lager för alla städer
const cityLayer = L.layerGroup().addTo(map);

const markers = {};

function addCity(city) {

    console.log(city);

    let icon;

    switch(city.map.icon){

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
        icon: icon
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

        console.log(markers);
}

const overlays = {
    "Major Settlements": cityLayer
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