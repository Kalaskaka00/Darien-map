function buildCampaignImage(article){

    if(!article.image)
        return "";

    return `
        <img
            class="campaign-image"
            src="wiki/Images/Campaigns/${escapeArticleHTML(article.image)}"
            alt="${escapeArticleHTML(article.name)} campaign art"
        >
    `;

}

function buildCampaignCard(article, compact = false){

    const color = article.color || "#5C0BB5";
    const time = compact
        ? formatHistoryElapsed(article)
        : formatHistoryContext(article);

    return `
        <section class="campaign-card" style="--campaign-color:${escapeArticleHTML(color)}; --history-color:${escapeArticleHTML(color)};">
            <header class="campaign-banner">
                <span>${escapeArticleHTML(article.name)}</span>
                <strong>${time}</strong>
            </header>
            ${buildCampaignImage(article)}
            ${buildHistoryTimeline(article)}
        </section>
    `;

}

registerArticleType("campaign",{

    sidebar(article){

        return buildCampaignCard(article);

    },

    preview(article){

        return buildCampaignCard(article, true);

    },

    focus: focusArticle,

    onOpen(article){},

    onClose(article){},

    icon:"⚔"

});
