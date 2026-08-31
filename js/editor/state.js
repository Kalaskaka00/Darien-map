//Editor Mode
let editorMode = null;

// Check if an interactive editor tool is active (drawing/editing)
function isEditorToolActive(){
    return editorMode !== null;
}

// Check if a line-drawing tool is active
function isLineDrawingActive(){
    return editorMode === "draw-road" || editorMode === "draw-polygon";
}

//Camera
let cameraHorizontal = null;
let cameraVertical = null;

let zoom1Rect = null;
let zoom2Rect = null;

//Draw Polygon
let polygonPoints = [];

let polygonPreview = null;

//Edit Shape
let editMarkers = [];

let edgeMarkers = [];

//Move Settlement
let editMarker = null;