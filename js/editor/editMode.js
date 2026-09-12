const editor = document.getElementById("editor");

if(editor){

    editor.style.display = isGM ? "block" : "none";

}

const panel = document.getElementById("editor-panel");

const editorToggle = document.getElementById("editor-toggle");

editorToggle.onclick = function(){

    panel.classList.toggle("open");
    editorToggle.classList.toggle("active");

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