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

    const displayPoints = smoothPolyline(object.points, 2);

    if(options.shadow){

        shadow = L.polyline(displayPoints, {
            color: options.shadow.color ?? "#444343",
            weight: options.weight + (options.shadow.extraWidth ?? 4),
            opacity: options.shadow.opacity ?? 0.6,
            interactive: false
        }).addTo(options.layer);

    }

    const line = L.polyline(displayPoints, {
        color: options.color,
        weight: options.weight,
        dashArray: options.dashArray ?? null,
        opacity: options.opacity ?? 1
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

    line.on("click", () => {

        if(editorMode === "edit-shape"){

            selectShape({

                object,

                points: object.points,

                closed: false,

                yamlKey: "points",

                refresh(){

                    line.setLatLngs(object.points);

                    if(shadow)
                        shadow.setLatLngs(object.points);

                }

            });

            return;

        }

        if(object.article){

            openArticle(getArticle(object.article));

        }

    });

    return line;

}