let borderPoints = [];

let borderPreview = null;

let editingCountry = null;

let editMarkers = [];

function enableEditBorder(){

    editingCountry = null;

}

function selectCountryForEditing(country){

    clearBorderHandles();

    editingCountry = country;

    showBorderHandles(country);

}

function editingCountry(country){
        let yaml = "border:\n";

        editingCountry.border.forEach(point => {
            yaml += `  - [${point[0]}, ${point[1]}]\n`;
        });

        navigator.clipboard.writeText(yaml);

        console.log(yaml);

        alert("Border copied!");

        return;
    };

function showBorderHandles(country){

    editingCountry = country;

    country.border.forEach((point,index)=>{

    const marker = L.marker(point,{
    draggable:true,
    icon:L.divIcon({
        className:"border-handle"
    })
    }).addTo(map);

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

function disableEditBorder(){

    clearBorderHandles();

}

registerEditorTool({

    id: "edit-border",

    group: "build",

    button: editBorderButton,

    activate: enableEditBorder,

    deactivate: disableEditBorder

});