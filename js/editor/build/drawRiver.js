const drawRiverButton =
    document.getElementById("draw-river");

function startRiverDrawing(){

    startLineDrawing({

        type: "river",

        class: "stream",

        color: riverStyles.stream.color,

        weight: riverStyles.stream.weight,

        onComplete(river){

            showRiverForm(river);

        }

    });

}

function enableDrawRiver(){

    startRiverDrawing();

}

function disableDrawRiver(){

    if(drawingConfig?.type === "river")
        stopLineDrawing();

}

const riverForm =
    document.getElementById("river-form");

let pendingRiver = null;

function showRiverForm(river){

    pendingRiver = river;

    document.getElementById("river-name").value =
        river.name || "";

    document.getElementById("river-class").value =
        river.class || "stream";

    document.getElementById("river-article").value =
        river.article || "";

    riverForm.style.display = "block";

}

function hideRiverForm(){

    riverForm.style.display = "none";
    pendingRiver = null;

}

function continueRiverDrawing(){

    startRiverDrawing();

}

document.getElementById("river-create").onclick = async function(){

    if(!pendingRiver)
        return;

    pendingRiver.name =
        document.getElementById("river-name").value.trim();

    pendingRiver.class =
        document.getElementById("river-class").value;

    pendingRiver.article =
        document.getElementById("river-article").value.trim() || null;

    const river = pendingRiver;
    const saved = await addRiverToFile(river);

    if(!saved){

        alert("River added to the map, but the rivers file was not saved.");

    }

    hideRiverForm();
    continueRiverDrawing();

};

document.getElementById("river-cancel").onclick = function(){

    hideRiverForm();
    continueRiverDrawing();

};

registerEditorTool({

    id: "draw-river",

    group: "build",

    button: drawRiverButton,

    activate: enableDrawRiver,

    deactivate: disableDrawRiver

});
