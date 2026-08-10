function drawLine(object, options){

    // Valfri skugga
    let shadow = null;

    if(options.shadow){

        shadow = L.polyline(object.points, {
            color: options.shadow.color ?? "#444343",
            weight: options.weight + (options.shadow.extraWidth ?? 4),
            opacity: options.shadow.opacity ?? 0.6,
            interactive: false
        }).addTo(options.layer);

    }

    const line = L.polyline(object.points, {
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