const layers = {

    nations: L.layerGroup(),

    settlements: L.layerGroup(),

    labels: L.layerGroup(),

    rivers: L.layerGroup(),

    roads: L.layerGroup(),

    lakes: L.layerGroup(),

    tradeRoutes: L.layerGroup()

};

const mapObjects = {

    nations: {},

    settlements: {},

    rivers: {},

    roads: {},

    lakes: {},

    tradeRoutes: {}

};

const overlays = {

    "Labels": layers.labels,

    "Nations": layers.nations,

    "Settlements": layers.settlements,

    "Rivers": layers.rivers,

    "Roads": layers.roads,

    "Lakes": layers.lakes,

    "Trade Routes": layers.tradeRoutes

};

function initializeLayers(){

    Object.values(layers).forEach(layer => {

        layer.addTo(map);

    });

    L.control.layers(null, overlays).addTo(map);

}

function registerMapObject(type, id, layer){

    mapObjects[type][id] = layer;

}

function getMapObject(type, id){

    return mapObjects[type][id];

}