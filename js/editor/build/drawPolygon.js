const drawPolygonButton =
    document.getElementById("draw-polygon");

function enableDrawPolygon(){

    polygonPoints = [];

    if(polygonPreview){

        map.removeLayer(polygonPreview);

        polygonPreview = null;

    }

    map.on("click", drawPolygonClick);

    map.on("contextmenu", finishPolygon);

}

function disableDrawPolygon(){

    map.off("click", drawPolygonClick);

    map.off("contextmenu", finishPolygon);

    polygonPoints = [];

    if(polygonPreview){

        map.removeLayer(polygonPreview);

        polygonPreview = null;

    }

}

function drawPolygonClick(e){

    polygonPoints.push([
        Math.round(e.latlng.lat),
        Math.round(e.latlng.lng)
    ]);

    if(polygonPreview)
        map.removeLayer(polygonPreview);

    polygonPreview = L.polygon(polygonPoints,{
        color:"red"
    }).addTo(map);

};

function finishPolygon(){

    let yaml = "polygon:\n";

    polygonPoints.forEach(point => {

        yaml += `  - [${point[0]}, ${point[1]}]\n`;

    });

    navigator.clipboard.writeText(yaml);

    alert("Polygon copied to clipboard!");

    closeEditorTool();

};

registerEditorTool({

    id: "draw-polygon",

    group: "build",

    button: drawPolygonButton,

    activate: enableDrawPolygon,

    deactivate: disableDrawPolygon

});