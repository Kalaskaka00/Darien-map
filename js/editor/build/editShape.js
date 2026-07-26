const editShapeButton =
    document.getElementById("edit-shape");

function enableEditShape(){

    editingShape = null;

    map.on("contextmenu", finishEditShape);

}

function selectShape(shape){

    clearShapeHandles();

    editingShape = shape;

    showShapeHandles();

}

function showShapeHandles(){

    editingShape.points.forEach((point, index) => {

        const marker = L.marker(point, {
            draggable: true,
            icon: L.divIcon({
                className: "shape-handle"
            })
        }).addTo(map);

        marker.on("drag", function(){

            const pos = marker.getLatLng();

            editingShape.points[index] = [
                Math.round(pos.lat),
                Math.round(pos.lng)
            ];

            editingShape.refresh();

        });

        marker.on("dragend", function(){

        refreshShapeEditor();

        });

        marker.on("contextmenu", function(e){

        L.DomEvent.stop(e);

        removeShapePoint(index);

        });

        editMarkers.push(marker);

        showEdgeHandles();

    });

}

function refreshShapeEditor(){

    editingShape.refresh();

    clearShapeHandles();
    showShapeHandles();

}

function clearShapeHandles(){

    editMarkers.forEach(marker=>{

        map.removeLayer(marker);

    });

    editMarkers = [];

    clearEdgeHandles();

}

function showEdgeHandles(){

    const points = editingShape.points;

    for(let i = 0; i < points.length; i++){

        const next = (i + 1) % points.length;

        const a = points[i];
        const b = points[next];

        const mid = [
            (a[0] + b[0]) / 2,
            (a[1] + b[1]) / 2
        ];

        const marker = L.marker(mid, {
            interactive: true,
            icon: L.divIcon({
                className: "edge-handle"
            })
        }).addTo(map);

        marker.on("click", function(){

            const pos = marker.getLatLng();

            editingShape.points.splice(
                i + 1,
                0,
                [
                    Math.round(pos.lat),
                    Math.round(pos.lng)
                ]
            );

            refreshShapeEditor();

        });

        edgeMarkers.push(marker);

    }

}

function clearEdgeHandles(){

    edgeMarkers.forEach(marker => {

        map.removeLayer(marker);

    });

    edgeMarkers = [];

}

function removeShapePoint(index){

    // Förhindra polygoner med för få punkter
    if(editingShape.points.length <= 3){

        alert("A polygon must have at least 3 points.");

        return;

    }

    editingShape.points.splice(index, 1);

    refreshShapeEditor();

}

function finishEditShape(){

    if(!editingShape)
        return;

    let yaml = "border:\n";

    editingShape.points.forEach(point => {

        yaml += `  - [${point[0]}, ${point[1]}]\n`;

    });

    navigator.clipboard.writeText(yaml);

    closeEditorTool();

    alert("Shape copied!");

}

function disableEditShape(){

    map.off("contextmenu", finishEditShape);

    clearShapeHandles();

    editingShape = null;

}

registerEditorTool({

    id: "edit-shape",

    group: "build",

    button: editShapeButton,

    activate: enableEditShape,

    deactivate: disableEditShape

});