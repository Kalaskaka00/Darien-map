const layers = {

    nations: L.layerGroup(),

    settlements: L.layerGroup(),

    labels: L.layerGroup(),

    roads: L.layerGroup(),

    streams: L.layerGroup(),

    lakes: L.layerGroup(),

    tradeRoutes: L.layerGroup()

};

const mapObjects = {

    nations: {},

    settlements: {},

    roads: {},

    streams: {},

    lakes: {},

    tradeRoutes: {}

};

const overlays = {

    "Labels": layers.labels,

    "Nations": layers.nations,

    "Settlements": layers.settlements,

    "Roads": layers.roads,

    "Streams": layers.streams,

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