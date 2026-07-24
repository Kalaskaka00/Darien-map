const drawBorderButton = document.getElementById("draw-border");

function enableDrawBorder(){

    borderPoints = [];

    if(borderPreview){

        map.removeLayer(borderPreview);

        borderPreview = null;

    }

    map.on("click", drawBorderClick);

    map.on("contextmenu", finishBorder);

}

function disableDrawBorder(){

    map.off("click", drawBorderClick);

    map.off("contextmenu", finishBorder);

    borderPoints = [];

    if(borderPreview){

        map.removeLayer(borderPreview);

        borderPreview = null;

    }

}

function drawBorderClick(e){

    borderPoints.push([
        Math.round(e.latlng.lat),
        Math.round(e.latlng.lng)
    ]);

    if(borderPreview)
        map.removeLayer(borderPreview);

    borderPreview = L.polygon(borderPoints,{
        color:"red"
    }).addTo(map);

};

function finishBorder(){

    editorMode = null;

    updateEditorButtons();

    let yaml = "border:\n";

    borderPoints.forEach(point => {

        yaml += `  - [${point[0]}, ${point[1]}]\n`;

    });

    navigator.clipboard.writeText(yaml);

    alert("Border copied to clipboard!");

};

registerEditorTool({

    id: "draw-border",

    group: "build",

    button: drawBorderButton,

    activate: enableDrawBorder,

    deactivate: disableDrawBorder

});