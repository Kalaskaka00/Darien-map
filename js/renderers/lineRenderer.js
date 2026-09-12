// Catmull-Rom spline: creates smooth curve that passes through all control points
function catmullRomSpline(points, numSegments = 10) {
    if (points.length < 2) return points;
    
    const result = [];
    
    for (let i = 0; i < points.length - 1; i++) {
        // Get the four points for this segment
        const p0 = i === 0 ? points[0] : points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i === points.length - 2 ? points[points.length - 1] : points[i + 2];
        
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
    
    // Add final point
    result.push(points[points.length - 1]);
    
    return result;
}

function smoothPolyline(points, iterations = 1) {

    let result = points;

    for (let k = 0; k < iterations; k++) {

        const newPoints = [result[0]];

        for (let i = 0; i < result.length - 1; i++) {

            const p0 = result[i];
            const p1 = result[i + 1];

            const Q = [
                0.75 * p0[0] + 0.25 * p1[0],
                0.75 * p0[1] + 0.25 * p1[1]
            ];

            const R = [
                0.25 * p0[0] + 0.75 * p1[0],
                0.25 * p0[1] + 0.75 * p1[1]
            ];

            newPoints.push(Q);
            newPoints.push(R);

        }

        newPoints.push(result[result.length - 1]);

        result = newPoints;
    }

    return result;
}

function drawLine(object, options){

    // Valfri skugga
    let shadow = null;

    const displayPoints = catmullRomSpline(object.points, 10);

    if(options.shadow){

        shadow = L.polyline(displayPoints, {
            color: options.shadow.color ?? "#444343",
            weight: options.weight + (options.shadow.extraWidth ?? 4),
            opacity: options.shadow.opacity ?? 0.6,
            interactive: false,
            pane: options.pane
        }).addTo(options.layer);

    }

    const line = L.polyline(displayPoints, {
        color: options.color,
        weight: options.weight,
        dashArray: options.dashArray ?? null,
        opacity: options.opacity ?? 1,
        pane: options.pane
    }).addTo(options.layer);

    registerMapObject(
        options.type,
        object.id,
        line
    );

    if(object.name){

        line.bindTooltip(object.name);

    }

    // Valfri hover-effekt
    if(options.hover){

        line.on("mouseover", function(){

            line.setStyle({
                weight: options.weight + (options.hover.extraWidth ?? 5)
            });

        });

        line.on("mouseout", function(){

            line.setStyle({
                weight: options.weight
            });

        });

    }

    line.on("click", (e) => {

        if(editorMode === "edit-shape"){

            selectShape({

                object,

                points: object.points,

                closed: false,

                yamlKey: "points",

                refresh(){

                    line.setLatLngs(catmullRomSpline(object.points, 10));

                    if(shadow)
                        shadow.setLatLngs(catmullRomSpline(object.points, 10));

                }

            });

            return;

        }

        if(isMeasureToolActive()){

            L.DomEvent.stop(e);

            const clickLat = Math.round(e.latlng.lat);
            const clickLng = Math.round(e.latlng.lng);
            let nearestPoint = object.points[0];
            let minDistance = Math.pow(clickLat - nearestPoint[0], 2) + Math.pow(clickLng - nearestPoint[1], 2);

            for(let i = 1; i < object.points.length; i++){

                const point = object.points[i];
                const distance = Math.pow(clickLat - point[0], 2) + Math.pow(clickLng - point[1], 2);

                if(distance < minDistance){
                    minDistance = distance;
                    nearestPoint = point;
                }

            }

            addMeasurementPointAt(nearestPoint[0], nearestPoint[1]);

            return;

        }

        // If a line drawing tool is active, snap to nearest control point
        if(isLineDrawingActive()){

            L.DomEvent.stopPropagation(e);

            const clickLat = Math.round(e.latlng.lat);
            const clickLng = Math.round(e.latlng.lng);

            // Find nearest ORIGINAL control point to where user clicked
            // This ensures snapping to actual points, not interpolated smoothed points
            let nearestPoint = object.points[0];
            let minDistance = Math.pow(clickLat - nearestPoint[0], 2) + Math.pow(clickLng - nearestPoint[1], 2);

            for(let i = 1; i < object.points.length; i++){

                const point = object.points[i];
                const distance = Math.pow(clickLat - point[0], 2) + Math.pow(clickLng - point[1], 2);

                if(distance < minDistance){

                    minDistance = distance;
                    nearestPoint = point;

                }

            }

            // Add original control point so new roads curve nicely
            addPointToLineDrawing(nearestPoint[0], nearestPoint[1]) || 
            addPointToPolygonDrawing(nearestPoint[0], nearestPoint[1]);

            return;

        }

        if(object.article){

            openArticle(getArticle(object.article));

        }

    });

    return line;

}