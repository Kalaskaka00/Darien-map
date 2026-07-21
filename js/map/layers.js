const nationLayer = L.layerGroup();
const cityLayer = L.layerGroup();

const markers = {};
const nationPolygons = {};

const overlays = {
    "Nations": nationLayer,
    "Settlements": cityLayer
};

function initializeLayers(){

    cityLayer.addTo(map);

    nationLayer.addTo(map);

    L.control.layers(null, overlays).addTo(map);

}