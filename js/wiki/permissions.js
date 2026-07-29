function canReadArticle(article){

    if(isGM)
        return true;

    return isGM || article.visibility !== "gm";

}