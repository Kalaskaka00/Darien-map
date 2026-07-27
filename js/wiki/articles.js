let currentArticle = null;

function getArticle(name){

    return world.find(
        article => article.name === name
    );

}

function getArticleByFile(file){

    return world.find(
        article => article.file === file
    );

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