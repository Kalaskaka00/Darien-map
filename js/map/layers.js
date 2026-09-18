const layers = {

    nations: L.layerGroup(),

    settlements: L.layerGroup(),

    rivers: L.layerGroup(),

    roads: L.layerGroup()

};

const mapObjects = {

    nations: {},

    settlements: {},

    rivers: {},

    roads: {}

};

const layerLabels = {
    nations: "Nations",
    settlements: "Settlements",
    rivers: "Rivers",
    roads: "Roads"
};

let applyingLayerOrder = false;

function getLayerOrder(){

    const configuredOrder = CONFIG.map.layerOrder || [];
    const configuredLayers = configuredOrder.filter(layerName => layers[layerName]);
    const missingLayers = Object.keys(layers).filter(layerName => !configuredLayers.includes(layerName));

    return [...configuredLayers, ...missingLayers];

}

function getOrderedOverlays(){

    return Object.fromEntries(
        getLayerOrder().map(layerName => [layerLabels[layerName], layers[layerName]])
    );

}

function applyLayerOrder(){

    if(applyingLayerOrder)
        return;

    applyingLayerOrder = true;

    try {

        const activeLayerNames = getLayerOrder().filter(layerName => map.hasLayer(layers[layerName]));

        activeLayerNames.forEach(layerName => {

            map.removeLayer(layers[layerName]);

        });

        activeLayerNames.reverse().forEach(layerName => {

            layers[layerName].addTo(map);

        });

    } finally {

        applyingLayerOrder = false;

    }

}

function initializeLayers(){

    getLayerOrder().reverse().forEach(layerName => {

        if(isLayerInitiallyVisible(layerName))
            layers[layerName].addTo(map);

    });

    applyLayerOrder();

    L.control.layers(null, getOrderedOverlays()).addTo(map);

    map.on("overlayadd", applyLayerOrder);

}

function registerMapObject(type, id, layer){

    mapObjects[type][id] = layer;

}

function getMapObject(type, id){

    return mapObjects[type][id];

}

function isLayerInitiallyVisible(layerName){

    return CONFIG.map.layerVisibility?.[layerName] !== false;

}