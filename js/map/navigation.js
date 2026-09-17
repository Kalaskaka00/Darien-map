function openArticle(article, addToHistory = true){

    if(!canReadArticle(article))
    return;

    closeDirectory?.();

    hidePreview();

    const activeTab = typeof getActiveWikiTab === "function"
        ? getActiveWikiTab()
        : null;

    if(!activeTab && typeof createWikiTab === "function")
        createWikiTab(article);

    const currentTab = typeof getActiveWikiTab === "function"
        ? getActiveWikiTab()
        : null;

    if(currentTab){

        currentTab.article = article;
        currentTab.directory = false;

    }

    setCurrentArticle(article);

    if(addToHistory){

        pushHistory(article);

    }

    loadArticle(article.file);

    const type = getArticleType(article.category);

    type?.focus?.(article);

    type?.onOpen?.(article);

    if(typeof renderWikiTabs === "function")
        renderWikiTabs();

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