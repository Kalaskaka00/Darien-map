function buildDeityNames(article){

    const names = Array.isArray(article.names)
        ? article.names.filter(Boolean)
        : [];

    if(!names.length)
        return "";

    return `<div class="deity-alternative-names">${escapeArticleHTML(names.join(", "))}</div>`;

}

function buildDeityCard(article, compact = false){

    const color = article.color || "#4b4b4b";
    const symbolImage = article.image
        ? `
            <img
                class="deity-symbol"
                src="wiki/Images/Symbols/${escapeArticleHTML(article.image)}"
                alt="${escapeArticleHTML(article.name)} symbol"
            >
        `
        : "";

    return `
        <section class="deity-card${compact ? " deity-card-compact" : ""}" style="--deity-color:${escapeArticleHTML(color)};">
            <header class="deity-banner">
                <span>${escapeArticleHTML(article.name)}</span>
                ${buildDeityNames(article)}
            </header>
            <div class="deity-content">
                ${symbolImage}
                <div class="deity-details">
                    ${sidebarRow("Aspects", article.aspects)}
                    ${sidebarRow("Domains", article.domains)}
                    ${sidebarRow("Symbols", article.symbols || article.symbol)}
                    ${compact ? "" : sidebarRow("Races", article.races)}
                </div>
            </div>
        </section>
    `;

}

registerArticleType("deity",{

    sidebar(article){

        return buildDeityCard(article);

    },

    preview(article){

        return buildDeityCard(article, true);

    },

    onOpen(article){},

    onClose(article){},

    icon:"✦"

});