// Kartans storlek i pixlar
const width = 1494;
const height = 1058;

// Skapa kartan
const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    zoomSnap: 0
});

map.createPane("rivers");
map.getPane("rivers").style.zIndex = 410;

map.createPane("roads");
map.getPane("roads").style.zIndex = 420;

// Definiera bildens hörn
const bounds = [
    [0, 0],
    [height, width]
];

const parchmentOverhang = CONFIG.map.parchmentOverhang;
const frameBounds = [
    [-parchmentOverhang.vertical, -parchmentOverhang.horizontal],
    [height + parchmentOverhang.vertical, width + parchmentOverhang.horizontal]
];

L.imageOverlay('map/Map.avif', frameBounds, { interactive: false }).addTo(map);
L.imageOverlay('map/Darien map.png', bounds).addTo(map);

// Anpassa kartan till bilden
map.fitBounds(frameBounds);
map.setMaxBounds(frameBounds);
map.dragging.enable();

requestAnimationFrame(() => {
    map.invalidateSize();
    map.fitBounds(frameBounds);
});

function initializeMap(){

    // Tom än så länge

}