function shrinkPolygon(points, factor){

    const center = polygonCentroid(points);

    return points.map(p => {

        return [

            center.lat + (p[0] - center.lat) * factor,

            center.lng + (p[1] - center.lng) * factor

        ];

    });

}



function addNation(country){

    const smoothBorder = catmullRomPolygon(country.border, 10);

    // Glow-lager
    const glow = L.polygon(smoothBorder, {
    color: country.color,
    weight: 20,
    opacity: 0.12,
    fill: false
    }).addTo(layers.nations);

    const glow2 = L.polygon(smoothBorder, {
    color: country.color,
    weight: 16,
    opacity: 0.12,
    fill: false
    }).addTo(layers.nations);

    const glow3 = L.polygon(smoothBorder, {
    color: country.color,
    weight: 12,
    opacity: 0.12,
    fill: false
    }).addTo(layers.nations);

    const glow4 = L.polygon(smoothBorder, {
    color: country.color,
    weight: 8,
    opacity: 0.12,
    fill: false
    }).addTo(layers.nations);

    const glow5 = L.polygon(smoothBorder, {
    color: country.color,
    weight: 4,
    opacity: 0.12,
    fill: false
    }).addTo(layers.nations);

    // Yttre gräns
    const outline = L.polygon(smoothBorder, {
        color: country.color,
        weight: 3,
        fill: false
    }).addTo(layers.nations);
    
    // Klick på landet + edit border
outline.on("click", (e) => {

    if(editorMode==="edit-shape"){

        selectShape(
            getCountryShape(country)
        );

        return;

    }

    // If a line drawing tool is active, snap to nearest control point
    if(isLineDrawingActive()){

        L.DomEvent.stopPropagation(e);

        const clickLat = Math.round(e.latlng.lat);
        const clickLng = Math.round(e.latlng.lng);

        // Find nearest ORIGINAL control point to where user clicked
        // This ensures snapping to actual points, not interpolated smoothed points
        let nearestPoint = country.border[0];
        let minDistance = Math.pow(clickLat - nearestPoint[0], 2) + Math.pow(clickLng - nearestPoint[1], 2);

        for(let i = 1; i < country.border.length; i++){

            const point = country.border[i];
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

    openArticle(country);

});

// Hover-effekt
outline.on("mouseover", () => {
        outline.setStyle({ weight: 5 });
    });

    outline.on("mouseout", () => {
        outline.setStyle({ weight: 3 });
    });

    // Landets namn
    const center = polygonCentroid(smoothBorder);

    L.marker(center, {
        icon: L.divIcon({
            className: "nation-label",
            html: `<span style="color:${country.color};">${country.name}</span>`,
            iconSize: [200, 30],
            iconAnchor: [100, 15]
        }),
        interactive: false
    }).addTo(layers.nations);

    registerMapObject(

    "nations",

    country.id,

    outline

    );
}

function getCountryShape(country){

    return {

        object: country,

        points: country.border,

        yamlKey: "border",

        closed: true,

        refresh(){

            getMapObject("nations",country.id).setLatLngs(
                catmullRomPolygon(country.border, 10)
            );

        }

    };

}


// Snygga till border
function smoothPolygon(points, iterations = 2) {

    let result = points;

    for (let k = 0; k < iterations; k++) {

        const newPoints = [];

        for (let i = 0; i < result.length; i++) {

            const p0 = result[i];
            const p1 = result[(i + 1) % result.length];

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

        result = newPoints;
    }

    return result;

}

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

// Räkna ut mitten av landet
function polygonCentroid(points) {

    let area = 0;
    let x = 0;
    let y = 0;

    for (let i = 0; i < points.length; i++) {

        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        const f = p1[1] * p2[0] - p2[1] * p1[0];

        area += f;
        x += (p1[1] + p2[1]) * f;
        y += (p1[0] + p2[0]) * f;
    }

    area *= 0.5;

    return L.latLng(
        y / (6 * area),
        x / (6 * area)
    );
}

registerArticleType("nation",{

    focus: focusArticle,

    onOpen(article){},

    onClose(article){},

    icon:"🏳️"

});