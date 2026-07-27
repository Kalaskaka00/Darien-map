document.getElementById("wiki-back").onclick =
    goBack;

document.getElementById("wiki-forward").onclick =
    goForward;

const articleHistory = {

    entries: [],

    index: -1

};

function pushHistory(article){

    if(articleHistory.entries[articleHistory.index] === article)
    return;

    // Om vi gått bakåt och sedan öppnar en ny artikel
    articleHistory.entries =
        articleHistory.entries.slice(
            0,
            articleHistory.index + 1
        );

    articleHistory.entries.push(article);

    articleHistory.index++;

    updateHistoryButtons();

}

function canGoBack(){

    return articleHistory.index > 0;

}

function canGoForward(){

    return articleHistory.index <
        articleHistory.entries.length - 1;

}

function goBack(){

    if(!canGoBack())
        return;

    articleHistory.index--;

    openArticle(
        articleHistory.entries[
            articleHistory.index
        ],
        false
    );

    updateHistoryButtons();

}

function goForward(){

    if(!canGoForward())
        return;

    articleHistory.index++;

    openArticle(
        articleHistory.entries[
            articleHistory.index
        ],
        false
    );

    updateHistoryButtons();

}

function updateHistoryButtons(){

    document.getElementById("wiki-back")
        .disabled = !canGoBack();

    document.getElementById("wiki-forward")
        .disabled = !canGoForward();

}