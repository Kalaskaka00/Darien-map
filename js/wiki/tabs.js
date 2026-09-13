let wikiTabs = [];
let activeWikiTabId = null;
let nextWikiTabId = 1;

const wikiTabList = document.getElementById("wiki-tab-list");
const newWikiTabButton = document.getElementById("wiki-new-tab");
const wikiTabTooltip = document.createElement("div");

wikiTabTooltip.id = "wiki-tab-tooltip";
document.body.appendChild(wikiTabTooltip);

function getActiveWikiTab(){

    return wikiTabs.find(tab => tab.id === activeWikiTabId);

}

function renderWikiTabs(){

    wikiTabList.innerHTML = wikiTabs
        .map(tab => {

            const name = String(tab.article.name || "Article");
            const escapedName = escapeWikiTabText(name);

            return `
            <button class="wiki-tab${tab.id === activeWikiTabId ? " active" : ""}" type="button" data-wiki-tab-id="${tab.id}" data-tooltip="${escapedName}" aria-label="${escapedName}">
                <span class="wiki-tab-title">${escapeWikiTabText(getWikiTabLabel(name))}</span>
                <span class="wiki-tab-close" role="button" aria-label="Close ${escapedName}">×</span>
            </button>
        `;

        })
        .join("");

}

function getWikiTabLabel(name){

    if(name.length <= 10)
        return name;

    return name.slice(0, 10).trimEnd() + ".";

}

function escapeWikiTabText(value){

    return String(value || "Article")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

function createWikiTab(article){

    const tab = {
        id: nextWikiTabId++,
        article
    };

    wikiTabs.push(tab);
    activeWikiTabId = tab.id;
    renderWikiTabs();

    return tab;

}

function activateWikiTab(tab){

    activeWikiTabId = tab.id;

    if(tab.directory){

        setCurrentArticle(tab.article);
        openDirectoryView();
        renderWikiTabs();
        return;

    }

    closeDirectory?.();
    setCurrentArticle(tab.article);
    renderWikiTabs();
    loadArticle(tab.article.file);

}

function openArticleInNewTab(article){

    if(!canReadArticle(article))
        return;

    closeDirectory?.();
    hidePreview();
    createWikiTab(article);
    openArticle(article);

}

function openDirectoryInNewTab(){

    const tab = createWikiTab({
        name: "Article directory",
        file: null
    });

    tab.directory = true;
    openDirectoryView();
    renderWikiTabs();

}

function closeWikiTab(tabId){

    const tabIndex = wikiTabs.findIndex(tab => tab.id === tabId);

    if(tabIndex < 0)
        return;

    const wasActive = wikiTabs[tabIndex].id === activeWikiTabId;
    wikiTabs.splice(tabIndex, 1);

    if(!wikiTabs.length){

        const homeArticle = getHomeArticle();

        if(homeArticle){

            createWikiTab(homeArticle);
            openArticle(homeArticle, false);

        }

    }else if(wasActive){

        const nextTab = wikiTabs[tabIndex] || wikiTabs[tabIndex - 1];
        activateWikiTab(nextTab);

    }

    renderWikiTabs();

}

wikiTabList.addEventListener("click", event => {

    const tabButton = event.target.closest("[data-wiki-tab-id]");

    if(!tabButton)
        return;

    const tabId = Number(tabButton.dataset.wikiTabId);
    const tab = wikiTabs.find(item => item.id === tabId);

    if(!tab)
        return;

    if(event.target.closest(".wiki-tab-close")){

        event.stopPropagation();
        closeWikiTab(tabId);
        return;

    }

    activateWikiTab(tab);

});

wikiTabList.addEventListener("mouseover", event => {

    const tab = event.target.closest(".wiki-tab");

    if(!tab || tab.contains(event.relatedTarget))
        return;

    wikiTabTooltip.textContent = tab.dataset.tooltip;
    wikiTabTooltip.style.display = "block";

    const rect = tab.getBoundingClientRect();
    const tooltipRect = wikiTabTooltip.getBoundingClientRect();

    wikiTabTooltip.style.left = `${rect.right + 8}px`;
    wikiTabTooltip.style.top = `${Math.max(8, Math.min(rect.top, window.innerHeight - tooltipRect.height - 8))}px`;

});

wikiTabList.addEventListener("mouseout", event => {

    const tab = event.target.closest(".wiki-tab");

    if(!tab || tab.contains(event.relatedTarget))
        return;

    wikiTabTooltip.style.display = "none";

});

newWikiTabButton.onclick = () => {

    const homeArticle = getHomeArticle();

    if(homeArticle)
        openArticleInNewTab(homeArticle);

};

document.addEventListener("auxclick", event => {

    if(event.button !== 1)
        return;

    const link = event.target.closest(".wikilink, [data-directory-file]");

    if(link){

        const article = link.dataset.page
            ? getArticle(link.dataset.page)
            : world.find(item => item.file === link.dataset.directoryFile);

        if(!article)
            return;

        event.preventDefault();
        openArticleInNewTab(article);
        return;

    }

    const button = event.target.closest("#wiki-back, #wiki-forward, #wiki-home, #wiki-directory");

    if(!button)
        return;

    event.preventDefault();

    if(button.id === "wiki-back" && canGoBack()){

        openArticleInNewTab(articleHistory.entries[articleHistory.index - 1]);
        return;

    }

    if(button.id === "wiki-forward" && canGoForward()){

        openArticleInNewTab(articleHistory.entries[articleHistory.index + 1]);
        return;

    }

    if(button.id === "wiki-home"){

        const homeArticle = getHomeArticle();

        if(homeArticle)
            openArticleInNewTab(homeArticle);

        return;

    }

    openDirectoryInNewTab();

});
