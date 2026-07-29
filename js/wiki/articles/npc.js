function buildNPCSidebar(article){

    const portrait = article.portrait || `${article.fullname}.webp`;

    const deceased = article.death ? "npc-deceased" : "";

    const name = article.death
        ? `† ${article.fullname}`
        : article.fullname;

    return `

<div class="npc-card ${deceased}" style="--npc-color:${article.color};">

    <div class="npc-banner">
        ${name}
    </div>

    <div class="npc-content">

        <div class="npc-left">

            <img
                class="npc-portrait"
                src="wiki/Images/NPCs/${portrait}"
                alt="${article.fullname}"
            >

        </div>

        <div class="npc-right">

        ${sidebarRow("Race", article.race)}
        ${sidebarRow("Age", calculateAge(article))}
        ${sidebarRow("Origin", article.origin)}
        ${sidebarRow("Family", article.family)}
        ${sidebarRow("Organisations", article.organisations)}

        </div>

    </div>

</div>

`;

function sidebarRow(label, value){

    if(value === undefined || value === null || value === "")
        return "";

    const display =
        typeof value === "string" || Array.isArray(value)
            ? renderWikiLinks(value)
            : value;

    return `
        <div class="npc-row">
            <span>${label}</span>
            <span>${display}</span>
        </div>
    `;
}

}

function renderNPCQuote(markdown){

    const match = markdown.match(
        /^(# .+\n)\*([^*]+)\*\n/m
    );

    if(!match){

        return marked.parse(markdown);

    }

    markdown = markdown.replace(
        /\*([^*]+)\*\n/,
        ""
    );

    const html = marked.parse(markdown);

    return html.replace(
        "</h1>",
        `</h1>
        <div class="npc-quote">
            ${match[2]}
        </div>`
    );

}

function buildNPCPreview(article){

        console.log(article);

    return buildNPCSidebar(article);

}

registerArticleType("npc",{

    sidebar: buildNPCSidebar,

    onOpen(article){},

    onClose(article){},

    preview: buildNPCPreview,

    icon:"👤"

});