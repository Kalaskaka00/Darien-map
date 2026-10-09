function shrinkPolygon(points, factor){

    const center = polygonCentroid(points);

    return points.map(p => {

        return [

            center.lat + (p[0] - center.lat) * factor,

            center.lng + (p[1] - center.lng) * factor

        ];

    });

}

function createNationGlowClip(glowLayers, outline){

    const outlineElement = outline.getElement();
    const renderer = outline._renderer;

    if(!outlineElement || !renderer)
        return null;

    const svg = renderer._container;
    const namespace = "http://www.w3.org/2000/svg";
    const defs = svg.querySelector("defs") || document.createElementNS(namespace, "defs");
    const clipPath = document.createElementNS(namespace, "clipPath");
    const clipShape = document.createElementNS(namespace, "path");
    const clipId = `nation-glow-clip-${L.Util.stamp(outline)}`;
    const filter = document.createElementNS(namespace, "filter");
    const blur = document.createElementNS(namespace, "feGaussianBlur");
    const filterId = `nation-glow-blur-${L.Util.stamp(outline)}`;

    if(!defs.parentNode)
        svg.insertBefore(defs, svg.firstChild);

    clipPath.setAttribute("id", clipId);
    clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");
    clipPath.appendChild(clipShape);
    defs.appendChild(clipPath);

    filter.setAttribute("id", filterId);
    filter.setAttribute("x", "-50%");
    filter.setAttribute("y", "-50%");
    filter.setAttribute("width", "200%");
    filter.setAttribute("height", "200%");
    blur.setAttribute("stdDeviation", "2.5");
    filter.appendChild(blur);
    defs.appendChild(filter);

    glowLayers.forEach(layer => {

        const element = layer.getElement();

        element?.setAttribute("clip-path", `url(#${clipId})`);
        element?.setAttribute("filter", `url(#${filterId})`);

    });

    const update = () => {

        clipShape.setAttribute("d", outlineElement.getAttribute("d") || "");

    };

    update();
    map.on("zoomend", () => requestAnimationFrame(update));

    return update;
}



function addNation(country){

    const smoothBorder = catmullRomPolygon(country.border, 10);

    const glowOptions = {
        color: country.color,
        opacity: 0.12,
        fill: false
    };

    const glowLayers = [
        L.polygon(smoothBorder, { ...glowOptions, weight: 42 }).addTo(layers.nations),
        L.polygon(smoothBorder, { ...glowOptions, weight: 32 }).addTo(layers.nations),
        L.polygon(smoothBorder, { ...glowOptions, weight: 22 }).addTo(layers.nations),
        L.polygon(smoothBorder, { ...glowOptions, weight: 14 }).addTo(layers.nations),
        L.polygon(smoothBorder, { ...glowOptions, weight: 7 }).addTo(layers.nations)
    ];

    // Yttre gräns
    const outline = L.polygon(smoothBorder, {
        color: country.color,
        weight: 3,
        fill: false
    }).addTo(layers.nations);

    const updateGlowClip = createNationGlowClip(glowLayers, outline);

    outline._nationGlowLayers = glowLayers;
    outline._updateNationGlowClip = updateGlowClip;
    
    // Klick på landet + edit border
outline.on("click", (e) => {

    if(editorMode==="edit-shape"){

        selectShape(
            getCountryShape(country)
        );

        return;

    }

    if(isMeasureToolActive()){

        L.DomEvent.stop(e);

        const clickLat = Math.round(e.latlng.lat);
        const clickLng = Math.round(e.latlng.lng);
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

            const updatedBorder = catmullRomPolygon(country.border, 10);
            const outline = getMapObject("nations", country.id);

            outline.setLatLngs(updatedBorder);
            outline._nationGlowLayers?.forEach(layer => layer.setLatLngs(updatedBorder));
            outline._updateNationGlowClip?.();

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

function nationRulerRow(value){

    if(typeof value !== "string")
        return sidebarRow("Ruler", value);

    const linkMatch = value.match(/^\s*\[\[([\s\S]+?)\]\]\s*$/);

    if(!linkMatch)
        return sidebarRow("Ruler", value);

    const [target, alias] = linkMatch[1].split("|");
    const page = target.split("#")[0].trim();
    const ruler = getArticle(page);

    if(!ruler || !["npc", "pc"].includes(ruler.category))
        return sidebarRow("Ruler", value);

    const fullName = String(ruler.fullname || "").trim();
    const label = fullName || String(alias || page).trim();
    const escapedPage = escapeArticleHTML(ruler.name);
    const handlerPage = ruler.name
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
    const rulerLink = `
        <a href="#" class="wikilink nation-ruler-link" data-page="${escapedPage}" onmouseenter="hoverArticle(event,'${handlerPage}')" onmouseleave="hidePreview()">${escapeArticleHTML(label)}</a>
    `;

    if(!fullName){

        getArticleData(ruler).then(data => {

            const loadedFullName = String(data.fullname || "").trim();

            if(!loadedFullName)
                return;

            document.querySelectorAll(".nation-ruler-link").forEach(link => {

                if(link.dataset.page === ruler.name)
                    link.textContent = loadedFullName;

            });

        }).catch(error => {

            console.error(`Unable to load full name for ruler "${ruler.name}":`, error);

        });

    }

    return `
        <div class="npc-row">
            <span>Ruler</span>
            <span>${rulerLink}</span>
        </div>
    `;

}

function focusNationArticle(article){

    focusArticle(article);
    highlightFamilyMap({
        ...article,
        majorLocations: article.capital,
        nations: article.name
    });

    if(article.capital)
        return;

    getArticleData(article).then(data => {

        if(getCurrentArticle()?.file !== article.file)
            return;

        highlightFamilyMap({
            ...article,
            ...data,
            majorLocations: data.capital,
            nations: article.name
        });

    }).catch(error => {

        console.error(`Unable to load map highlights for nation "${article.name}":`, error);

    });

}

function buildNationSidebar(article){

    const color = article.color || "#6f5328";
    const secondaryColor = article.secondaryColor || color;
    const image = article.image
        ? `<img class="nation-crest" src="wiki/Images/Coat of Arms/${article.image}" alt="${escapeArticleHTML(article.name)} flag or coat of arms">`
        : "";

    return `
        <section class="nation-card" style="--nation-color:${color};--nation-secondary-color:${secondaryColor};">
            <header class="nation-banner">
                <span>${escapeArticleHTML(article.name)}</span>
            </header>
            <div class="nation-content">
                <div class="nation-left">
                    ${image}
                </div>
                <div class="nation-right">
                    ${sidebarRow("Capital", article.capital)}
                    ${nationRulerRow(article.ruler)}
                    ${sidebarRow("Common races", article.races)}
                </div>
            </div>
        </section>
    `;

}

registerArticleType("nation",{

    sidebar: buildNationSidebar,

    preview: buildNationSidebar,

    focus: focusNationArticle,

    onOpen(article){},

    onClose(article){

        clearFamilyMapHighlights();

    },

    icon:"🏳️"

});