const drawTradeRouteButton =
    document.getElementById("draw-trade-route");

function startTradeRouteDrawing(){

    startLineDrawing({

        type: "tradeRoute",

        class: "minor",

        color: tradeRouteStyles.land.color,

        weight: tradeRouteStyles.minor.weight,

        dashArray: tradeRouteStyles.dashArray,

        shadow: {
            ...tradeRouteStyles.shadow,
            color: "#202020"
        },

        onComplete(tradeRoute){

            showTradeRouteForm(tradeRoute);

        }

    });

}

function enableDrawTradeRoute(){

    startTradeRouteDrawing();

}

function disableDrawTradeRoute(){

    if(drawingConfig?.type === "tradeRoute")
        stopLineDrawing();

}

const tradeRouteForm =
    document.getElementById("trade-route-form");

let pendingTradeRoute = null;

function showTradeRouteForm(tradeRoute){

    pendingTradeRoute = tradeRoute;

    document.getElementById("trade-route-name").value =
        tradeRoute.name || "";

    document.getElementById("trade-route-class").value =
        tradeRoute.class || "minor";

    document.getElementById("trade-route-mode").value =
        tradeRoute.mode || "land";

    document.getElementById("trade-route-article").value =
        tradeRoute.article || "";

    tradeRouteForm.style.display = "block";

}

function hideTradeRouteForm(){

    tradeRouteForm.style.display = "none";
    pendingTradeRoute = null;

}

document.getElementById("trade-route-create").onclick = async function(){

    if(!pendingTradeRoute)
        return;

    const name = document.getElementById("trade-route-name").value.trim();

    if(!name){

        alert("Trade routes must have a name.");
        return;

    }

    pendingTradeRoute.name = name;

    pendingTradeRoute.class =
        document.getElementById("trade-route-class").value;

    pendingTradeRoute.mode =
        document.getElementById("trade-route-mode").value;

    pendingTradeRoute.article =
        document.getElementById("trade-route-article").value.trim() || null;

    const tradeRoute = pendingTradeRoute;
    const saved = await addTradeRouteToFile(tradeRoute);

    if(!saved){

        alert("Trade route added to the map, but the trade routes file was not saved.");

    }

    hideTradeRouteForm();
    startTradeRouteDrawing();

};

document.getElementById("trade-route-cancel").onclick = function(){

    hideTradeRouteForm();
    startTradeRouteDrawing();

};

registerEditorTool({

    id: "draw-trade-route",

    group: "build",

    button: drawTradeRouteButton,

    activate: enableDrawTradeRoute,

    deactivate: disableDrawTradeRoute

});
