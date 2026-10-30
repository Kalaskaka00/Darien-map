function getTradeRouteStyle(route){

    return {
        color: tradeRouteStyles[route.mode].color,
        weight: tradeRouteStyles[route.class].weight,
        dashArray: tradeRouteStyles.dashArray,
        shadow: {
            ...tradeRouteStyles.shadow,
            color: route.mode === "underground" ? "#ddd7c8" : "#202020"
        }
    };

}

function addTradeRoute(route){

    drawLine(

        route,

        {
            ...getTradeRouteStyle(route),
            layer: layers.tradeRoutes,
            type: "tradeRoutes",
            hover: true
        }

    );

}

let tradeRoutes = [];
let tradeRoutesFileHandle = null;
let tradeRoutesReady;

async function loadTradeRoutes(){

    tradeRoutes = await fetch("js/map/layers/tradeRoutes.json")
        .then(response => {

            if(!response.ok)
                throw new Error(`Could not load trade routes: ${response.status}`);

            return response.json();

        });

    tradeRoutes.forEach(addTradeRoute);
    orderLineLayers(layers.tradeRoutes);

}

function downloadTradeRoutesFile(){

    const file = new Blob([
        JSON.stringify(tradeRoutes, null, 4) + "\n"
    ], { type: "application/json" });

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = "tradeRoutes.json";
    link.click();

    URL.revokeObjectURL(url);

}

async function saveTradeRoutesFile(){

    const contents = JSON.stringify(tradeRoutes, null, 4) + "\n";

    try {

        if(window.showOpenFilePicker && !tradeRoutesFileHandle){

            [tradeRoutesFileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: "Trade route data",
                    accept: { "application/json": [".json"] }
                }]
            });

        }

        if(tradeRoutesFileHandle){

            const writable = await tradeRoutesFileHandle.createWritable();
            await writable.write(contents);
            await writable.close();
            return true;

        }

    } catch(error){

        if(error.name === "AbortError")
            return false;

        console.error("Could not save trade routes file.", error);

    }

    downloadTradeRoutesFile();
    return true;

}

async function addTradeRouteToFile(route){

    await tradeRoutesReady;
    tradeRoutes.push(route);
    addTradeRoute(route);
    orderLineLayers(layers.tradeRoutes);

    return saveTradeRoutesFile();

}

async function saveTradeRouteToFile(route){

    await tradeRoutesReady;

    const index = tradeRoutes.findIndex(item => item.id === route.id);

    if(index === -1)
        return false;

    tradeRoutes[index] = route;

    return saveTradeRoutesFile();

}

tradeRoutesReady = loadTradeRoutes().catch(error => {

    console.error(error);
    alert("Trade routes could not be loaded.");

});
