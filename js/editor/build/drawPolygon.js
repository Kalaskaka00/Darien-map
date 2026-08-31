const drawPolygonButton =
    document.getElementById("draw-polygon");

// Catmull-Rom spline for polygons: creates smooth curve that passes through all control points
function catmullRomPolygon(points, numSegments = 10) {
    if (points.length < 2) return points;
    
    const result = [];
    
    for (let i = 0; i < points.length; i++) {
        // Get the four points for this segment (wrapping around for polygon)
        const p0 = points[(i - 1 + points.length) % points.length];
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const p3 = points[(i + 2) % points.length];
        
        // Add the starting control point
        result.push(p1);
        
        // Interpolate between p1 and p2
        for (let t = 1; t < numSegments; t++) {
            const s = t / numSegments;
            const s2 = s * s;
            const s3 = s2 * s;
            
            // Catmull-Rom matrix coefficients
            const lat = 0.5 * (
                (2 * p1[0]) +
                (-p0[0] + p2[0]) * s +
                (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 +
                (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3
            );
            
            const lng = 0.5 * (
                (2 * p1[1]) +
                (-p0[1] + p2[1]) * s +
                (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 +
                (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3
            );
            
            result.push([lat, lng]);
        }
    }
    
    return result;
}

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

// Allow external code to add points to the current polygon drawing
function addPointToPolygonDrawing(lat, lng){

    if(editorMode !== "draw-polygon"){
        return false;
    }

    polygonPoints.push([
        Math.round(lat),
        Math.round(lng)
    ]);

    if(polygonPreview)
        map.removeLayer(polygonPreview);

    polygonPreview = L.polygon(catmullRomPolygon(polygonPoints, 10),{
        color:"red"
    }).addTo(map);

    return true;

}

function drawPolygonClick(e){

    polygonPoints.push([
        Math.round(e.latlng.lat),
        Math.round(e.latlng.lng)
    ]);

    if(polygonPreview)
        map.removeLayer(polygonPreview);

    polygonPreview = L.polygon(catmullRomPolygon(polygonPoints, 10),{
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