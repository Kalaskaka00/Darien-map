const drawRoadButton =
    document.getElementById("draw-road");

function enableDrawRoad(){

    startLineDrawing({

        type: "road",

        class: "road",

        color: roadStyles.road.color,

        weight: roadStyles.road.weight,

        onComplete(road){

            showRoadForm(road);

        }

    });

}

function disableDrawRoad(){

    stopLineDrawing();

}

const roadForm =
    document.getElementById("road-form");

let pendingRoad = null;

function showRoadForm(road){

    pendingRoad = road;

    document.getElementById("road-name").value =
        road.name || "";

    document.getElementById("road-class").value =
        road.class || "road";

    document.getElementById("road-article").value =
        road.article || "";

    roadForm.style.display = "block";

}

function hideRoadForm(){

    roadForm.style.display = "none";

    pendingRoad = null;

}

document.getElementById("road-create").onclick = async function(){

    if(!pendingRoad)
        return;

    pendingRoad.name =
        document.getElementById("road-name").value.trim();

    pendingRoad.class =
        document.getElementById("road-class").value;

    pendingRoad.article =
        document.getElementById("road-article").value.trim() || null;

    const road = pendingRoad;

    const saved = await addRoadToFile(road);

    if(!saved){

        alert("Road added to the map, but the roads file was not saved.");

    }

    hideRoadForm();

    // Starta om ritningen direkt
    startLineDrawing({

        type: "road",

        class: "road",

        color: roadStyles.road.color,

        weight: roadStyles.road.weight,

        onComplete(road){

            showRoadForm(road);

        }

    });

};

document.getElementById("road-cancel").onclick = function(){

    hideRoadForm();

    startRoadDrawing();

};

registerEditorTool({

    id: "draw-road",

    group: "build",

    button: drawRoadButton,

    activate: enableDrawRoad,

    deactivate: disableDrawRoad

});