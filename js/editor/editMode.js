const editor = document.getElementById("editor");

if(editor){

    editor.style.display = isGM ? "block" : "none";

}

const panel = document.getElementById("editor-panel");

document.getElementById("editor-toggle").onclick = function(){

    panel.classList.toggle("open");

};

function updateEditorButtons(){

    for(const tool of getEditorTools()){

    if(tool.id === editorMode){

        tool.activate();

    }else{

        tool.deactivate();

    }

    }

    if(editorMode !== "edit-shape"){

    clearShapeHandles();

    }
}

console.log("GM mode:", isGM);