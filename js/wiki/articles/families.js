let familyHighlightLayers = [];

function familySidebarRow(label, value){

    if(Array.isArray(value) && value.length === 0)
        return "";

    return sidebarRow(label, value);

}

function getFamilyLocationArticles(locations){

    return (Array.isArray(locations) ? locations : [locations])
        .map(location => String(location || "").replace(/^\[\[|\]\]$/g, "").trim())
        .map(location => getArticle(location))
        .filter(article => article?.category === "settlement" && article.map);

}

function clearFamilyMapHighlights(){

    familyHighlightLayers.forEach(({layer, type}) => {

        if(type === "badge" && layer.remove)
            layer.remove();

        if(type === "nation" && layer.getElement)
            layer.getElement()?.classList.remove("family-nation-highlight");

        if(type === "nation" && layer.setStyle)
            layer.setStyle({weight: 3});

    });

    familyHighlightLayers = [];

}

function addFamilyLocationBadge(location, article, size, kind){

    if(!article.image)
        return;

    const imageFolder = article.category === "organisation"
        ? "Symbols"
        : "Coat of Arms";

    const badge = L.marker([location.map.y, location.map.x], {
        icon: L.divIcon({
            className: `family-location-badge family-location-badge-${kind}`,
            html: `<img src="wiki/Images/${imageFolder}/${article.image}" alt="">`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size + 18]
        }),
        interactive: false,
        keyboard: false
    }).addTo(layers.settlements);

    badge.getElement()?.style.setProperty(
        "--family-map-color",
        article.primaryColor || article.color || "#6f5328"
    );

    familyHighlightLayers.push({layer: badge, type: "badge"});

}

function highlightFamilyMap(article){

    clearFamilyMapHighlights();

    getFamilyLocationArticles(article.majorLocations)
        .forEach(location => addFamilyLocationBadge(location, article, 64, "major"));

    getFamilyLocationArticles(article.minorLocations)
        .forEach(location => addFamilyLocationBadge(location, article, 36, "minor"));

    (Array.isArray(article.nations) ? article.nations : [article.nations])
        .map(nation => String(nation || "").replace(/^\[\[|\]\]$/g, "").trim())
        .map(nation => getArticle(nation))
        .filter(nation => nation?.category === "nation")
        .forEach(nation => {

            const border = getMapObject("nations", nation.id);

            if(!border)
                return;

            border.setStyle({weight: 6});
            border.getElement()?.classList.add("family-nation-highlight");
            familyHighlightLayers.push({layer: border, type: "nation"});

        });

}

function focusFamilyArticle(article){

    focusArticle(article);

    if(article.majorLocations || article.minorLocations || article.nations){

        highlightFamilyMap(article);
        return;

    }

    getArticleData(article).then(data => {

        if(getCurrentArticle()?.file !== article.file)
            return;

        highlightFamilyMap({...article, ...data});

    });

}

function buildFamilySidebar(article){

    const color = article.primaryColor || article.color || "#6f5328";
    const secondaryColor = article.secondaryColor || article.secondatyColor || color;
    const imageFolder = article.category === "organisation"
        ? "Symbols"
        : "Coat of Arms";
    const image = article.image
        ? `<img class="family-crest" src="wiki/Images/${imageFolder}/${article.image}" alt="${escapeArticleHTML(article.name)} symbol">`
        : "";

    return `
        <section class="family-card" style="--family-color:${color};--family-secondary-color:${secondaryColor};">
            <header class="family-banner">
                <span>${escapeArticleHTML(article.name)}</span>
            </header>
            <div class="family-content">
                <div class="family-left">
                    ${image}
                </div>
                <div class="family-right">
                    ${sidebarRow("Leader", article.leader)}
                    ${familySidebarRow("Nations", article.nations)}
                    ${familySidebarRow("Major locations", article.majorLocations)}
                    ${familySidebarRow("Minor locations", article.minorLocations)}
                    ${sidebarRow("Races", article.races)}
                </div>
            </div>
        </section>
    `;

}

registerArticleType("family",{

    sidebar: buildFamilySidebar,

    preview: buildFamilySidebar,

    focus: focusFamilyArticle,

    onOpen(article){},

    onClose(article){

        clearFamilyMapHighlights();

    },

    icon:"🏛️"

});
