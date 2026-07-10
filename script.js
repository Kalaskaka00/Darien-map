const SmallCityIcon = L.icon({
    iconUrl: 'icons/Small_City.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const LargeCityStoneWallTowersIcon = L.icon({
    iconUrl: 'icons/Large_City_Stone_Wall_Towers.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

// Kartans storlek i pixlar
const width = 1494;
const height = 1058;

// Skapa kartan
const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2
});

// Definiera bildens hörn
const bounds = [
    [0, 0],
    [height, width]
];

// Lägg in bilden
L.imageOverlay('map/Darien map.png', bounds).addTo(map);

// Anpassa kartan till bilden
map.fitBounds(bounds);
map.setMaxBounds(bounds);
map.dragging.enable();
map.on("click", function(e) {
    console.log(e.latlng);
});

// Lager för alla städer
const cityLayer = L.layerGroup().addTo(map);

function addCity(name, x, y, IconType, type, description) {

    let icon;

    switch(IconType){

        case "Large_City_Stone_Wall_Towers":
            icon = LargeCityStoneWallTowersIcon;
            break;

            case "Small_City":
            icon = SmallCityIcon;
            break;

            deafult:
            console.warn("Okänd ikontyp:", IconType);
            icon = SmallCityIcon;        
    }

    L.marker([y, x], {
        icon: icon
})
        .bindPopup(`
            <div class="city-popup">
            <h2>${name}</h2>
            <div class="city-type">${type}</div>
            
            <p><strong>Description: </strong>${description}</p>
            </div>
        `)
        .addTo(cityLayer);
}

fetch("data/cities.json")
    .then(response => response.json())
    .then(cities => {

cities.forEach(city => {
    addCity(
            city.name,
            city.x,
            city.y,
            city.IconType,
            city.type,
            city.description
        );
    });
});



const overlays = {
    "Cities": cityLayer,
};

L.control.layers(null, overlays).addTo(map);