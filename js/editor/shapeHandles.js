function showShapeHandles(){

    editingShape.points.forEach((point, index) => {

        closed: true

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

        });

        marker.on("dragend", function(){

        refreshEditor();

        });

        marker.on("contextmenu", function(e){

        L.DomEvent.stop(e);

        removeShapePoint(index);

        });

        editMarkers.push(marker);

        showEdgeHandles();

    });

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

    const max = editingShape.closed
    ? points.length
    : points.length - 1;

for(let i = 0; i < max; i++){

        const next = editingShape.closed
            ? (i + 1) % points.length
            : i + 1;

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

            refreshEditor();

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