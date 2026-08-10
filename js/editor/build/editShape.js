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

    // Förhindra polygoner med för få punkter
    const minimumPoints = editingShape.closed ? 3 : 2;

if(editingShape.points.length <= minimumPoints){

    alert(
        editingShape.closed
        ? "A polygon must have at least 3 points."
        : "A line must have at least 2 points."
    );

    return;

    }{

        alert("A polygon must have at least 3 points.");

        return;

    }

    editingShape.points.splice(index, 1);

    refreshEditor();

}

function finishEditShape(){

    if(!editingShape)
        return;

    let yaml = `${editingShape.yamlKey}:\n`;

    editingShape.points.forEach(point => {

        yaml += `  - [${point[0]}, ${point[1]}]\n`;

    });

    navigator.clipboard.writeText(yaml);

    closeEditorTool();

    alert("Shape copied!");

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