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

    const smoothBorder = smoothPolygon(country.border, 2);

    // Glow-lager
    const glow = L.polygon(smoothBorder, {
    color: country.color,
    weight: 20,
    opacity: 0.12,
    fill: false
    }).addTo(nationLayer);

    const glow2 = L.polygon(smoothBorder, {
    color: country.color,
    weight: 16,
    opacity: 0.12,
    fill: false
    }).addTo(nationLayer);

    const glow3 = L.polygon(smoothBorder, {
    color: country.color,
    weight: 12,
    opacity: 0.12,
    fill: false
    }).addTo(nationLayer);

    const glow4 = L.polygon(smoothBorder, {
    color: country.color,
    weight: 8,
    opacity: 0.12,
    fill: false
    }).addTo(nationLayer);

    const glow5 = L.polygon(smoothBorder, {
    color: country.color,
    weight: 4,
    opacity: 0.12,
    fill: false
    }).addTo(nationLayer);

    // Yttre gräns
    const outline = L.polygon(smoothBorder, {
        color: country.color,
        weight: 3,
        fill: false
    }).addTo(nationLayer);
    nationPolygons[country.id] = outline;

    // Klick på landet + edit border
outline.on("click",()=>{

    if(editorMode==="edit-border"){

        showBorderHandles(country);

        return;

    }

    openEntry(country);
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
    }).addTo(nationLayer);
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