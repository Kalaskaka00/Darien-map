const regionsLayer = layers.regions;
const regionBorderPane = map.createPane("regionBorderPane");
const regionBorders = new Map();
const regionLabels = new Map();
let openRegionBorder = null;
let openRegionKey = null;

regionBorderPane.style.zIndex = "450";

function getRegionArea(points){

    return Math.abs(points.reduce((area, point, index) => {

        const nextPoint = points[(index + 1) % points.length];
        return area + point[0] * nextPoint[1] - nextPoint[0] * point[1];

    }, 0) / 2);

}

function addRegion(region){

    if(!Array.isArray(region.border) || region.border.length < 3){
        console.warn(`Region "${region.name}" has no valid map border and will not be labeled.`);
        return;
    }

    const regionKey = region.file || region.id || region.name;
    const border = region.border.map(point => [Number(point[0]), Number(point[1])]);
    regionBorders.set(regionKey, border);

    const marker = L.marker(polygonCentroid(border), {
        icon: getRegionLabelIcon(region, border)
    }).addTo(regionsLayer);
    regionLabels.set(regionKey, marker);

    marker.on("click", () => openArticle(region));

}

function getRegionLabelIcon(region, border){

    const fontSize = Math.min(
        38,
        Math.max(16, 13 + Math.sqrt(getRegionArea(border)) * 0.1)
    );

    return L.divIcon({
        className: "region-label",
        html: `<span style="font-size:${fontSize}px">${escapeArticleHTML(region.name)}</span>`,
        iconSize: [300, 50],
        iconAnchor: [150, 25]
    });

}

function getRegionShape(region){

    const regionKey = region.file || region.id || region.name;
    const border = regionBorders.get(regionKey);

    if(!border)
        return null;

    return {
        object: region,
        points: border,
        yamlKey: "border",
        closed: true,
        refresh(){

            const borderPoints = catmullRomPolygon(border, 10);
            const label = regionLabels.get(regionKey);

            if(label){
                label.setLatLng(polygonCentroid(border));
                label.setIcon(getRegionLabelIcon(region, border));
            }

            if(openRegionKey === regionKey && openRegionBorder){
                openRegionBorder.eachLayer(layer => layer.setLatLngs(borderPoints));
            }

        }
    };

}

function clearRegionBorder(){

    if(!openRegionBorder)
        return;

    map.removeLayer(openRegionBorder);
    openRegionBorder = null;
    openRegionKey = null;

}

function showRegionBorder(region){

    clearRegionBorder();

    const regionKey = region.file || region.id || region.name;
    const border = regionBorders.get(regionKey);

    if(!border)
        return;

    const borderPoints = catmullRomPolygon(border, 10);
    const dotOptions = {
        pane: "regionBorderPane",
        fill: false,
        dashArray: "1 14",
        lineCap: "round",
        interactive: true,
        bubblingMouseEvents: false
    };

    const backgroundOutline = L.polygon(borderPoints, {
        ...dotOptions,
        color: "#fff2c7",
        weight: 12,
        opacity: 0.95
    });
    const foregroundOutline = L.polygon(borderPoints, {
        ...dotOptions,
        color: "#4b1f08",
        weight: 7,
        opacity: 1
    });

    foregroundOutline.on("click", event => {

        if(editorMode !== "edit-shape")
            return;

        L.DomEvent.stop(event);
        const shape = getRegionShape(region);

        if(shape)
            selectShape(shape);

    });

    openRegionBorder = L.layerGroup([
        backgroundOutline,
        foregroundOutline
    ]).addTo(map);
    openRegionKey = regionKey;

}

registerArticleType("region",{

    focus: focusArticle,

    onOpen: showRegionBorder,

    onClose: clearRegionBorder,

    icon: "🗺️"

});
