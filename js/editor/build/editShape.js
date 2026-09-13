const editShapeButton =
    document.getElementById("edit-shape");

function enableEditShape(){

    editingShape = null;

    map.on("contextmenu", finishEditShape);

}

function selectShape(shape){

    editingShape = shape;

    refreshEditor();

}

function removeShapePoint(index){

    const minimumPoints = editingShape.closed ? 3 : 2;

    if(editingShape.points.length <= minimumPoints){

        alert(
            editingShape.closed
                ? "A polygon must have at least 3 points."
                : "A line must have at least 2 points."
        );

        return;

    }

    editingShape.points.splice(index, 1);

    refreshEditor();

}

async function finishEditShape(){

    if(!editingShape)
        return;

    let yaml = `${editingShape.yamlKey}:\n`;

    editingShape.points.forEach(point => {

        yaml += `  - [${point[0]}, ${point[1]}]\n`;

    });

    let saved = null;

    if(editingShape.object?.type === "road")
        saved = await saveRoadToFile(editingShape.object);

    if(editingShape.object?.type === "river")
        saved = await saveRiverToFile(editingShape.object);

    navigator.clipboard.writeText(yaml);

    closeEditorTool();

    if(saved === false){

        alert("Shape copied, but the map file was not saved.");

    }else if(saved === true){

        alert("Shape saved and copied!");

    }else{

        alert("Shape copied!");

    }

}

function disableEditShape(){

    map.off("contextmenu", finishEditShape);

    clearShapeHandles();

    editingShape = null;

}

registerEditorTool({

    id: "edit-shape",

    group: "build",

    button: editShapeButton,

    activate: enableEditShape,

    deactivate: disableEditShape

});