const moveSettlementButton =
    document.getElementById("move-settlement");

function enableMoveSettlement(){

    editingSettlement = null;

    map.on("contextmenu", finishMoveSettlement);

}

function selectSettlementForMoving(city, marker){

    editingSettlement = city;

    marker.dragging.enable();

    marker.once("dragend", finishMoveSettlement);

}

function finishMoveSettlement(){

    if(!editingSettlement)
        return;

    const yaml =
`map:
  x: ${editingSettlement.map.x}
  y: ${editingSettlement.map.y}`;

    navigator.clipboard.writeText(yaml);

    closeEditorTool();

    alert("Coordinates copied!");

}

function disableMoveSettlement(){

    map.off("contextmenu", finishMoveSettlement);

    if(editMarker){

        map.removeLayer(editMarker);

        editMarker = null;

    }

    editingSettlement = null;

}

registerEditorTool({

    id: "move-settlement",

    group: "build",

    button: moveSettlementButton,

    activate: enableMoveSettlement,

    deactivate: disableMoveSettlement

});