const showAllDecorationsButton = document.getElementById("show-all-decorations");

function enableShowAllDecorations(){

    setShowAllDecorations(true);

}

function disableShowAllDecorations(){

    setShowAllDecorations(false);

}

registerEditorTool({
    id: "show-all-decorations",
    group: "build",
    button: showAllDecorationsButton,
    activate: enableShowAllDecorations,
    deactivate: disableShowAllDecorations
});
