let drawingLine = null;
let drawingPoints = [];
let drawingConfig = null;

function startLineDrawing(config){

    stopLineDrawing();

    drawingConfig = config;
    drawingPoints = [];

    map.on("click", addLinePoint);
    map.on("contextmenu", finishLineDrawing);

}

function addLinePoint(e){

    drawingPoints.push([
        Math.round(e.latlng.lat),
        Math.round(e.latlng.lng)
    ]);

    updateLinePreview();

}

// Allow external code to add points to the current line drawing
function addPointToLineDrawing(lat, lng){

    if(!drawingConfig || editorMode !== "draw-road" && editorMode !== "draw-river" && editorMode !== "draw-polygon"){
        return false;
    }

    drawingPoints.push([
        Math.round(lat),
        Math.round(lng)
    ]);

    updateLinePreview();
    return true;

}

function updateLinePreview(){

    if(drawingLine){

        map.removeLayer(drawingLine);

        drawingLine = null;

    }

    if(drawingPoints.length < 2)
        return;

    drawingLine = L.polyline(

        catmullRomSpline(drawingPoints, 10),

        {
            color: drawingConfig.color ?? "#888",
            weight: drawingConfig.weight ?? 4,
            dashArray: drawingConfig.dashArray ?? null,
            interactive: false
        }

    ).addTo(map);

}

function finishLineDrawing(e){

    L.DomEvent.stop(e);

    if(drawingPoints.length < 2){

        stopLineDrawing();

        return;

    }

    const object = {

        id: `new_${drawingConfig.type}_${Date.now()}`,

        name: "",

        type: drawingConfig.type,

        class: drawingConfig.class ?? null,

        article: null,

        points: [...drawingPoints]

    };

    drawingConfig.onComplete?.(object);

    stopLineDrawing();

}

function stopLineDrawing(){

    map.off("click", addLinePoint);
    map.off("contextmenu", finishLineDrawing);

    if(drawingLine){

        map.removeLayer(drawingLine);

        drawingLine = null;

    }

    drawingPoints = [];
    drawingConfig = null;

}