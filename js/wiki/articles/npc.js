function getPortraits(article){

    const portraits = Array.isArray(article.portrait)
        ? article.portrait
        : [article.portrait || `${article.fullname}.webp`];

    return portraits.filter(Boolean);

}

function escapeNPCAttribute(value){

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

function buildPortraits(article, imageFolder, expandable = true){

    return getPortraits(article).map((portrait, index) => `
            <img
                class="npc-portrait${index === 0 ? " npc-portrait-active" : ""}"
                ${expandable ? "data-expand-image=\"true\"" : ""}
                src="wiki/Images/${imageFolder}/${portrait}"
                alt="${escapeNPCAttribute(article.fullname)}"
            >
        `).join("");

}

function buildNPCSidebar(article, extraRows = "", imageFolder = "NPCs", expandable = true, linkedName = false){

    const portraits = getPortraits(article);

    const status = getCharacterTimelineStatus(article);
    const timelineClass = status === "deceased"
        ? "npc-deceased"
        : status === "unborn"
            ? "npc-unborn"
            : "";

    const fullname = article.fullname || article.name;
    const displayName = `${status === "deceased" ? "† " : ""}${fullname}`;
    const name = linkedName
        ? `<a class="wikilink" href="#" data-page="${escapeArticleHTML(article.name)}">${escapeArticleHTML(displayName)}</a>`
        : displayName;

    return `

<div class="npc-card ${timelineClass}" style="--npc-color:${article.color};">

    <div class="npc-banner">
        ${name}
    </div>

    <div class="npc-content">

        <div class="npc-left">

            <div class="npc-portrait-group" data-portrait-count="${portraits.length}">
                ${buildPortraits(article, imageFolder, expandable)}
            </div>

        </div>

        <div class="npc-right">

        ${extraRows}
        ${sidebarRow("Race", article.race)}
        ${sidebarRow("Age", calculateAge(article))}
        ${sidebarRow("Origin", article.origin)}
        ${sidebarRow("Family", article.family)}
        ${sidebarRow("Organisations", article.organisations)}

        </div>

    </div>

</div>

`;
}

let portraitRotationTimer;

function startPortraitRotation(){

    clearInterval(portraitRotationTimer);

    const delay = Number(CONFIG.npc?.portraitSwitchDelay) || 5000;

    portraitRotationTimer = setInterval(() => {

        document.querySelectorAll(".npc-portrait-group").forEach(group => {

            const portraits = group.querySelectorAll(".npc-portrait");

            if(portraits.length < 2)
                return;

            const activeIndex = [...portraits].findIndex(portrait =>
                portrait.classList.contains("npc-portrait-active")
            );

            portraits.forEach(portrait =>
                portrait.classList.remove("npc-portrait-active")
            );

            portraits[(activeIndex + 1) % portraits.length]
                .classList.add("npc-portrait-active");

        });

    }, delay);

}

function sidebarRow(label, value, renderLinks = true){

    if(value === undefined || value === null || value === "")
        return "";

    const display =
        renderLinks && (typeof value === "string" || Array.isArray(value))
            ? renderWikiLinks(value)
            : value;

    return `
        <div class="npc-row">
            <span>${label}</span>
            <span>${display}</span>
        </div>
    `;
}

function buildPCSidebar(article, linkedName = false){

    const extraRows = `
        ${sidebarRow("Player", article.player, false)}
        ${sidebarRow("Adventure", article.adventure)}
    `;

    return buildNPCSidebar(article, extraRows, "PCs", true, linkedName);
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

    return buildNPCSidebar(article, "", "NPCs", false);

}

registerArticleType("npc",{

    sidebar: buildNPCSidebar,

    onOpen(article){},

    onClose(article){},

    preview: buildNPCPreview,

    icon:"👤"

});

registerArticleType("pc",{

    sidebar: buildPCSidebar,

    onOpen(article){},

    onClose(article){},

    preview(article){
        return buildNPCSidebar(article, `
            ${sidebarRow("Player", article.player, false)}
            ${sidebarRow("Adventure", article.adventure)}
        `, "PCs", false);
    },

    icon:"👤"

});