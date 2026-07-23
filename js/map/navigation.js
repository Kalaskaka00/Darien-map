function openArticle(article){

    loadArticle(article.file);

    const type = getArticleType(article.category);

    type?.focus?.(article);

    type?.onOpen?.(article);

}

function focusArticle(article){

    if(article.view){

    map.flyTo(
        [article.view.y, article.view.x],
        article.view.zoom
    );

    }else if(article.map){

    map.flyTo(
        [article.map.y, article.map.x],
        2
    );

    }

}