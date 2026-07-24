/*/function updateEditorButtons(){

    for(const tool of getEditorTools()){

        tool.button.classList.toggle(
            "active",
            editorMode === tool.id
        );

        if(editorMode === tool.id){

            tool.activate();

        }else{

            tool.deactivate();

        }

    }

}/*/

for(const tool of getEditorTools()){

    console.log(tool);

    tool.button.classList.toggle(
        "active",
        editorMode === tool.id
    );
}

function initializeToolbar(){

    console.log("Initializing toolbar");

    for(const tool of getEditorTools()){

        tool.button.onclick = function(){

            editorMode =
                editorMode === tool.id
                ? null
                : tool.id;

            updateEditorButtons();

        };

    }

}