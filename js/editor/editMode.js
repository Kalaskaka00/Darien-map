const editor = document.getElementById("editor");

if(editor){

    editor.style.display = isGM ? "block" : "none";

}

let editorMode = null;

const panel = document.getElementById("editor-panel");

document.getElementById("editor-toggle").onclick = function(){

    panel.classList.toggle("open");

};

function updateEditorButtons(){
    cameraToolButton.classList.toggle(
    "active",
    editorMode === "camera-tool"
    );
    
    if(editorMode === "camera-tool"){

    enableCameraTool();

    }else{

    disableCameraTool();

    }

    drawBorderButton.classList.toggle(
        "active",
        editorMode === "draw-border"
    );

    moveSettlementButton.classList.toggle(
        "active",
        editorMode === "move-settlement"
    );

    editBorderButton.classList.toggle(
    "active",
    editorMode === "edit-border"
    );

    if(editorMode !== "edit-border"){

    clearBorderHandles();

    }
}

console.log("GM mode:", isGM);