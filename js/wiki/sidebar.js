CONFIG.world.currentYear

function renderSidebar(article){

    const sidebar=document.getElementById("article-sidebar");

    switch(article.category){

        case "npc":
            sidebar.innerHTML=buildNPCSidebar(article);
            break;

        default:
            sidebar.innerHTML="";
    }

}

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

            <div class="npc-row">
                <span>Race</span>
                <span>${article.race}</span>
            </div>

            <div class="npc-row">
                <span>Age</span>
                <span>${calculateAge(article)}</span>
            </div>

            <div class="npc-row">
                <span>Origin</span>
                <span>${renderWikiLinks(article.origin)}</span>
            </div>

            <div class="npc-row">
                <span>Family</span>
                <span>${renderWikiLinks(article.family)}</span>
            </div>

            <div class="npc-row">
                <span>Organisations</span>
                <span>${renderWikiLinks(article.organisations)}</span>
            </div>

        </div>

    </div>

</div>

`;

}

function calculateAge(article){

    if(!article.birth)
        return "";

    const birth = parseInt(article.birth);

    if(article.death){

        return `${article.death - birth} (Deceased)`;

    }

    return CONFIG.world.currentYear - birth;

}

function getArticleFolder(file){

    return file.substring(0,file.lastIndexOf("/"));

}