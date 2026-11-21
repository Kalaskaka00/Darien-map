function buildPlaceCard(article, preview = false) {
    const typeKeys = getPlaceTypeKeys(article);
    if(!typeKeys)
        return "";

    const styles = typeKeys.map(type => placePinStyles[type]);
    const banner = styles.length === 1
        ? styles[0].color
        : `linear-gradient(90deg, ${styles[0].color} 0 50%, ${styles[1].color} 50% 100%)`;
    const locationValues = Array.isArray(article.location)
        ? article.location.flat(Infinity)
        : [article.location];
    const locations = locationValues
        .filter(location => typeof location === "string" && location.trim());
    const locationContent = locations.length
        ? locations.map(location => renderWikiLinks(escapeArticleHTML(location))).join(", ")
        : "Location not specified";
    const typeLabels = styles
        .map(style => `
            <span style="--place-type-color:${style.color};--place-type-text-color:${style.textColor}">
                ${escapeArticleHTML(style.label)}
            </span>
        `)
        .join("");
    const typeLayout = styles.length === 2 ? " place-types-dual" : "";

    return `
        <section class="place-card${preview ? " place-card-preview" : ""}">
            <header class="place-banner" style="--place-banner:${banner}">
                <h2>${escapeArticleHTML(article.name)}</h2>
                <div class="place-location">${locationContent}</div>
                <div class="place-types${typeLayout}">${typeLabels}</div>
            </header>
        </section>
    `;
}

function buildPlaceSidebar(article) {
    return buildPlaceCard(article);
}

function buildPlacePreview(article) {
    return buildPlaceCard(article, true);
}

registerArticleType("place", {
    sidebar: buildPlaceSidebar,
    preview: buildPlacePreview,
    focus: focusArticle,
    icon: "📍"
});
