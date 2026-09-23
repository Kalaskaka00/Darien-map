function renderOrganisationMotto(markdown){

    const match = markdown.match(
        /^(# .+\n)\*([^*\n]+)\*\r?\n/m
    );

    if(!match)
        return marked.parse(markdown);

    const html = marked.parse(markdown.replace(match[0], match[1]));

    return html.replace(
        "</h1>",
        `</h1>
        <div class="npc-quote">
            ${match[2]}
        </div>`
    );

}

function buildOrganisationSidebar(article){

    const card = buildFamilySidebar(article);
    const typeRow = familySidebarRow("Type", article.type);

    return card.replace(
        '<div class="family-right">',
        `<div class="family-right">
                    ${typeRow}`
    );

}

registerArticleType("organisation",{

    sidebar: buildOrganisationSidebar,

    preview: buildOrganisationSidebar,

    focus: focusFamilyArticle,

    onOpen(article){},

    onClose(article){

        clearFamilyMapHighlights();

    },

    icon:"⚒️"

});
