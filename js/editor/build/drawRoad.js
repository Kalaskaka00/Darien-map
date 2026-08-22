const drawRoadButton =
    document.getElementById("draw-road");

function enableDrawRoad(){

    startLineDrawing({

        type: "road",

        class: "road",

        color: roadStyles.road.color,

        weight: roadStyles.road.weight,

        onComplete(road){

            addRoad(road);

        }

    });

}

function disableDrawRoad(){

    stopLineDrawing();

}

registerEditorTool({

    id: "draw-road",

    group: "build",

    button: drawRoadButton,

    activate: enableDrawRoad,

    deactivate: disableDrawRoad

});