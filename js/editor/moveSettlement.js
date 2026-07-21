const moveSettlementButton = document.getElementById("move-settlement");

moveSettlementButton.classList.toggle("active", editorMode === "move-settlement");

document.getElementById("move-settlement").onclick = function(){

    if(editorMode === "move-settlement"){

        editorMode = null;

    }else{

        editorMode = "move-settlement";

    }

    updateEditorButtons();

    if(editorMode !== "edit-border"){

    clearBorderHandles();

    }

    console.log(editorMode);

};