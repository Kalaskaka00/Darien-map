function openArticle(article, addToHistory = true, sharedAccess = false){

    if(!canReadArticle(article) && !sharedAccess)
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

    const previousArticle = getCurrentArticle();

    if(previousArticle && previousArticle.file !== article.file){

        getArticleType(previousArticle.category)?.onClose?.(previousArticle);

        if(currentTab){

            currentTab.scrollTop = 0;
            currentTab.scrollRestorePending = false;
            currentTab.scrollIntentStart = null;
            document.getElementById("wiki-sidebar").scrollTop = 0;

        }

    }

    if(currentTab){

        currentTab.article = article;
        currentTab.directory = false;
        currentTab.sharedAccess = sharedAccess;

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