function canReadArticleForPlayer(article, playerName, gmMode){

    // GM always sees everything
    if(gmMode) {
        return true;
    }

    // If no visibility specified, article is public
    if(!article.visibility) {
        return true;
    }

    // If visibility is "gm", only GM can see
    if(article.visibility === "gm") {
        return false;
    }

    // If visibility is "everyone", anyone can see
    if(article.visibility === "everyone") {
        return true;
    }

    // Handle player-specific visibility
    // visibility can be string (single player) or array (multiple players)
    const visibleTo = Array.isArray(article.visibility) 
        ? article.visibility 
        : [article.visibility];

    // Check if current player has access
    return playerName && visibleTo.includes(playerName);

}

function canReadArticle(article){

    return canReadArticleForPlayer(article, currentPlayer, isGM);

}