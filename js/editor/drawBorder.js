const drawBorderButton = document.getElementById("draw-border");

drawBorderButton.classList.toggle("active", editorMode === "draw-border");

map.on("click", function(e){

    if(editorMode !== "draw-border")
        return;

        borderPoints.push([
        Math.round(e.latlng.lat),
        Math.round(e.latlng.lng)
    ]);

    if(borderPreview)
        map.removeLayer(borderPreview);

    borderPreview = L.polygon(borderPoints,{
        color:"red"
    }).addTo(map);
});

map.on("contextmenu", function(){
    if(editorMode === "draw-border"){

        editorMode = null;
        updateEditorButtons();

        let yaml = "border:\n";

        borderPoints.forEach(point => {
            yaml += `  - [${point[0]}, ${point[1]}]\n`;
        });

        navigator.clipboard.writeText(yaml);

        console.log(yaml);

        alert("Border copied to clipboard!");

        return;
    }
});

document.getElementById("draw-border").onclick = function(){
    if(editorMode === "draw-border"){

        editorMode = null;

    }else{

        editorMode = "draw-border";

    }

        updateEditorButtons();

    borderPoints = [];

    if(borderPreview){
        map.removeLayer(borderPreview);
        borderPreview = null;
    }

    console.log("Editor mode:", editorMode);

};