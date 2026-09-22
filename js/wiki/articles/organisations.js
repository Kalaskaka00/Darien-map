function renderOrganisationMotto(markdown){

    const match = markdown.match(
        /^# .+\n[\s\S]*?^\*([^*\n]+)\*\s*$/m
    );

    if(!match)
        return marked.parse(markdown);

    const mottoLine = match[0].split("\n").pop();
    const html = marked.parse(markdown.replace(mottoLine, ""));

    return html.replace(
        "</h1>",
        `</h1>
        <div class="npc-quote">
            ${match[1]}
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
