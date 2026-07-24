const editorTools = {};

function registerEditorTool(tool){

    editorTools[tool.id] = tool;

}

function getEditorTool(id){

    return editorTools[id];

}

function getEditorTools(){

    return Object.values(editorTools);

}