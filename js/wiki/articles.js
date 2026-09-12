let currentArticle = null;

// Normalize apostrophe characters for consistent matching
function normalizeArticleName(name){
    return name
        .toLowerCase()
        .replace(/[''`]/g, "'"); // Convert all apostrophe variants to regular apostrophe
}

function getArticle(name){

    const normalized = normalizeArticleName(name);

    return world.find(
        article => normalizeArticleName(article.name) === normalized
    );

}

function getArticleByFile(file){

    return world.find(
        article => article.file === file
    );

}

function getHomeArticle(){

    return getArticleByFile("Home/Home.md") ||
        getArticle("Home");

}

function canReadArticle(article){

    if(isGM)
        return true;

    return article.visibility !== "gm";

}

function setCurrentArticle(article){

    currentArticle = article;

}

function getCurrentArticle(){

    return currentArticle;

}