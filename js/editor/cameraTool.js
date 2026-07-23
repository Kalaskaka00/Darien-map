let cameraLayer = L.layerGroup();

let cameraHorizontal = null;
let cameraVertical = null;

let zoom1Rect = null;
let zoom2Rect = null;

const cameraInfo = document.getElementById("camera-info");
const cameraToolButton = document.getElementById("camera-tool");

cameraToolButton.onclick = function(){

    editorMode =
        editorMode === "camera-tool"
        ? null
        : "camera-tool";

    updateEditorButtons();

}

function enableCameraTool(){

    cameraLayer.addTo(map);

    cameraInfo.style.display = "block";

    updateCameraTool();

}

function disableCameraTool(){

    cameraLayer.clearLayers();

    cameraInfo.style.display = "none";

    map.removeLayer(cameraLayer);

}

function updateCameraTool(){

    if(editorMode !== "camera-tool")
        return;

    cameraLayer.clearLayers();

    const center = map.getCenter();

    const size = 15;

    cameraHorizontal = L.polyline([
        [center.lat, center.lng - size],
        [center.lat, center.lng + size]
    ],{
        color:"yellow",
        weight:2,
        interactive:false
    });

    cameraVertical = L.polyline([
        [center.lat - size, center.lng],
        [center.lat + size, center.lng]
    ],{
        color:"yellow",
        weight:2,
        interactive:false
    });

    cameraLayer.addLayer(cameraHorizontal);
    cameraLayer.addLayer(cameraVertical);

    cameraInfo.innerHTML = `
    X: ${Math.round(center.lng)}<br>
    Y: ${Math.round(center.lat)}<br>
    Zoom: ${map.getZoom()}
    `;

    const bounds1 = getViewBounds(1);

    zoom1Rect = L.rectangle(bounds1,{
    color:"#b81010",
    weight:5,
    fill:false,
    interactive:false
    });

    cameraLayer.addLayer(zoom1Rect);

    const bounds2 = getViewBounds(2);

    zoom2Rect = L.rectangle(bounds2,{
    color:"#cf6e13",
    weight:5,
    fill:false,
    interactive:false
    });

    cameraLayer.addLayer(zoom2Rect);

}

cameraToolButton.classList.toggle(
    "active",
    editorMode === "camera-tool"
);

function getViewBounds(zoom){

    const center = map.getCenter();

    const size = map.getSize();

    const sidebar =
    document.getElementById("wiki-sidebar");

    const visibleWidth =
    size.x - sidebar.offsetWidth;

    // Mitten i pixlar på vald zoom
    const offset = sidebar.offsetWidth / 2;
    const centerPoint = map.project(center, zoom);
    centerPoint.x -= offset;

    // Halva skärmens storlek
    const halfWidth = size.x / 2;
    const halfHeight = size.y / 2;

    // Hörn i pixelkoordinater
    const topLeft = L.point(
        centerPoint.x - halfWidth,
        centerPoint.y - halfHeight
    );

    const bottomRight = L.point(
        centerPoint.x + halfWidth,
        centerPoint.y + halfHeight
    );

    return L.latLngBounds(
        map.unproject(topLeft, zoom),
        map.unproject(bottomRight, zoom)
    );

}

map.on("move", updateCameraTool);
map.on("zoom", updateCameraTool);