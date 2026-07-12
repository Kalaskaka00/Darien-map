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