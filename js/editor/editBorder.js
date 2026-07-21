const editBorderButton = document.getElementById("edit-border");

let borderPoints = [];

let borderPreview = null;

let editingCountry = null;

let editMarkers = [];

map.on("click", function(e){


    if(editorMode !== "edit-border"){

    clearBorderHandles();

    }

});

map.on("contextmenu", function(){
    if(editorMode === "edit-border"){

        if(!editingCountry)
            return;

        editorMode = null;
        updateEditorButtons();

        let yaml = "border:\n";

        editingCountry.border.forEach(point => {
            yaml += `  - [${point[0]}, ${point[1]}]\n`;
        });

        navigator.clipboard.writeText(yaml);

        console.log(yaml);

        alert("Border copied!");

        return;
    }
});

document.getElementById("edit-border").onclick = function(){

    if(editorMode==="edit-border"){

        editorMode=null;

    }else{

        editorMode="edit-border";

    }

    if(editorMode !== "edit-border"){

    clearBorderHandles();

    }

    updateEditorButtons();

};

function showBorderHandles(country){

    editingCountry = country;

    clearBorderHandles();

    country.border.forEach((point,index)=>{

    const marker = L.marker(point,{
    draggable:true,
    icon:L.divIcon({
        className:"border-handle"
    })
    }).addTo(map);

    marker.on("drag", function(){

    const pos = marker.getLatLng();

    country.border[index] = [

        Math.round(pos.lat),

        Math.round(pos.lng)

    ];

    });

    marker.on("drag", function(){

    const pos = marker.getLatLng();

    country.border[index]=[
        Math.round(pos.lat),
        Math.round(pos.lng)
    ];

    nationPolygons[country.id].setLatLngs(
        smoothPolygon(country.border,2)
    );

    });

    marker.on("dragend", function(){

    console.log(country.border);

    });

    editMarkers.push(marker);

})};

function clearBorderHandles(){

    editMarkers.forEach(marker => {

        map.removeLayer(marker);

    });

    editMarkers = [];

}