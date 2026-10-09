CONFIG.world.currentYear

const articleSidebar =
    document.getElementById("article-sidebar");

function renderSidebar(article){

    const type = getArticleType(article.category);

    if(!type?.sidebar){

        articleSidebar.innerHTML = "";

        return;

    }

    articleSidebar.innerHTML = type.sidebar(article);
    enableExpandableImages(articleSidebar);

    startPortraitRotation();

}

function calculateAge(article){

    if(article.birth === null ||
        article.birth === undefined ||
        String(article.birth).trim() === "")
        return "";

    const birth = Number.parseInt(article.birth, 10);
    const currentYear = Number(getCurrentYear());

    if(!Number.isFinite(birth) || !Number.isFinite(currentYear))
        return "";

    if(currentYear < birth)
        return "Not born yet";

    const death = article.death === null ||
        article.death === undefined ||
        String(article.death).trim() === ""
            ? NaN
            : Number(article.death);

    if(Number.isFinite(death) && currentYear >= death)
        return `${death - birth} (Deceased)`;

    return currentYear - birth;

}

function getCharacterTimelineStatus(article){

    const currentYear = Number(getCurrentYear());
    const birth = Number.parseInt(article.birth, 10);

    if(Number.isFinite(birth) && currentYear < birth)
        return "unborn";

    const death = article.death === null ||
        article.death === undefined ||
        String(article.death).trim() === ""
            ? NaN
            : Number(article.death);

    if(Number.isFinite(death) && currentYear >= death)
        return "deceased";

    return "alive";

}

function getArticleFolder(file){

    return file.substring(0,file.lastIndexOf("/"));

}