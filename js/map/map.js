// Kartans storlek i pixlar
const width = 1494;
const height = 1058;

// Skapa kartan
const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    zoomSnap: 0
});

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

const mapPreview = L.imageOverlay(
    'map/Darien map-preview.jpg',
    bounds,
    { interactive: false }
).addTo(map);

let detailedMapRequested = false;
let detailedMapLoaded = false;
let mapIsZooming = false;
let initialViewReady = false;

function loadDetailedMapWhenIdle(){

    if(detailedMapRequested || detailedMapLoaded || mapIsZooming)
        return;

    detailedMapRequested = true;

    const detailedMap = L.imageOverlay(
        'map/Darien map.png',
        bounds,
        { interactive: false, opacity: 0 }
    );

    detailedMap.once('load', () => {

        detailedMapLoaded = true;
        detailedMap.setOpacity(1);
        mapPreview.remove();

    });

    detailedMap.addTo(map);

}

function scheduleDetailedMap(){

    const schedule = window.requestIdleCallback || function(callback){
        window.setTimeout(callback, 250);
    };

    schedule(loadDetailedMapWhenIdle, { timeout: 1500 });

}

map.on('zoomstart', () => {
    mapIsZooming = true;
});

map.on('zoomend', () => {
    mapIsZooming = false;

    if(!initialViewReady)
        return;

    scheduleDetailedMap();
});

// Anpassa kartan till bilden
map.fitBounds(frameBounds);
map.setMaxBounds(frameBounds);
map.dragging.enable();

requestAnimationFrame(() => {
    map.invalidateSize();
    map.fitBounds(frameBounds);
    initialViewReady = true;
});

function initializeMap(){

    // Tom än så länge

}