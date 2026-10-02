let wikiTabs = [];
let activeWikiTabId = null;
let nextWikiTabId = 1;
const wikiTabsStorageKey = "darien-map-wiki-tabs";

const wikiTabList = document.getElementById("wiki-tab-list");
const newWikiTabButton = document.getElementById("wiki-new-tab");
const wikiSidebar = document.getElementById("wiki-sidebar");
const wikiTabTooltip = document.createElement("div");

wikiTabTooltip.id = "wiki-tab-tooltip";
document.body.appendChild(wikiTabTooltip);

function getActiveWikiTab(){

    return wikiTabs.find(tab => tab.id === activeWikiTabId);

}

function saveActiveWikiTabScroll(){

    const tab = getActiveWikiTab();

    if(tab && !tab.directory && !tab.scrollRestorePending)
        tab.scrollTop = wikiSidebar.scrollTop;

}

function persistWikiTabs(){

    const state = {
        tabs: wikiTabs.map(tab => ({
            file: tab.directory ? null : tab.article?.file || null,
            directory: Boolean(tab.directory),
            scrollTop: tab.directory ? null : tab.scrollTop || 0
        })),
        activeIndex: wikiTabs.findIndex(tab => tab.id === activeWikiTabId)
    };

    try{

        localStorage.setItem(wikiTabsStorageKey, JSON.stringify(state));

    }catch(error){

        console.warn("Unable to save wiki tabs:", error);

    }

}

function restoreWikiTabs(){

    let state;

    try{

        state = JSON.parse(localStorage.getItem(wikiTabsStorageKey) || "null");

    }catch(error){

        console.warn("Unable to read saved wiki tabs:", error);
        return false;

    }

    if(!Array.isArray(state?.tabs))
        return false;

    const restoredTabs = state.tabs
        .map(savedTab => {

            if(savedTab?.directory)
                return { article: { name: "Article directory", file: null }, directory: true };

            const article = getArticleByFile(savedTab?.file);

            return article && canReadArticle(article)
                ? {
                    article,
                    scrollTop: Number.isFinite(savedTab?.scrollTop)
                        ? Math.max(0, savedTab.scrollTop)
                        : 0
                }
                : null;

        })
        .filter(Boolean);

    if(!restoredTabs.length)
        return false;

    wikiTabs = restoredTabs.map(tab => ({
        ...tab,
        id: nextWikiTabId++
    }));

    const activeIndex = Number.isInteger(state.activeIndex)
        ? Math.min(Math.max(state.activeIndex, 0), wikiTabs.length - 1)
        : 0;

    activeWikiTabId = wikiTabs[activeIndex].id;
    renderWikiTabs();
    activateWikiTab(wikiTabs[activeIndex]);

    if(!wikiTabs[activeIndex].directory)
        pushHistory(wikiTabs[activeIndex].article);
    else
        updateHistoryButtons();

    return true;

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

    persistWikiTabs();

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
        article,
        scrollTop: 0
    };

    wikiTabs.push(tab);
    activeWikiTabId = tab.id;
    renderWikiTabs();

    return tab;

}

function activateWikiTab(tab){

    saveActiveWikiTabScroll();

    activeWikiTabId = tab.id;

    if(tab.directory){

        setCurrentArticle(tab.article);
        openDirectoryView();
        renderWikiTabs();
        return;

    }

    closeDirectory?.();
    setCurrentArticle(tab.article);
    tab.scrollRestorePending = true;
    tab.scrollIntentStart = null;
    wikiSidebar.scrollTop = 0;
    renderWikiTabs();
    loadArticle(tab.article.file).then(() => {

        if(activeWikiTabId === tab.id &&
            tab.scrollRestorePending &&
            getCurrentArticle()?.file === tab.article.file){

            tab.scrollIntentStart = null;
            wikiSidebar.scrollTop = tab.scrollTop || 0;

        }

    });

}

function openArticleInNewTab(article, sharedAccess = false){

    if(!canReadArticle(article) && !sharedAccess)
        return;

    saveActiveWikiTabScroll();
    closeDirectory?.();
    hidePreview();
    const tab = createWikiTab(article);
    tab.sharedAccess = sharedAccess;
    wikiSidebar.scrollTop = 0;
    openArticle(article, true, sharedAccess);

}

function openDirectoryInNewTab(){

    saveActiveWikiTabScroll();
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

    if(wikiTabs[tabIndex].id === activeWikiTabId)
        saveActiveWikiTabScroll();

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

wikiSidebar.addEventListener("scroll", () => {

    const tab = getActiveWikiTab();

    if(directoryOpen || !tab)
        return;

    if(tab.scrollRestorePending){

        if(tab.scrollIntentStart !== null &&
            wikiSidebar.scrollTop !== tab.scrollIntentStart){

            tab.scrollRestorePending = false;
            tab.scrollIntentStart = null;
            saveActiveWikiTabScroll();

        }

        return;

    }

    saveActiveWikiTabScroll();

}, { passive: true });

function noteWikiSidebarScrollIntent(){

    const tab = getActiveWikiTab();

    if(tab?.scrollRestorePending && tab.scrollIntentStart === null)
        tab.scrollIntentStart = wikiSidebar.scrollTop;

}

wikiSidebar.addEventListener("wheel", noteWikiSidebarScrollIntent, { passive: true });
wikiSidebar.addEventListener("touchstart", noteWikiSidebarScrollIntent, { passive: true });
wikiSidebar.addEventListener("pointerdown", noteWikiSidebarScrollIntent, { passive: true });

document.addEventListener("keydown", event => {

    if(!["ArrowDown", "ArrowUp", " ", "End", "Home", "PageDown", "PageUp"].includes(event.key))
        return;

    if(wikiSidebar.contains(document.activeElement) || document.activeElement === document.body)
        noteWikiSidebarScrollIntent();

});

window.addEventListener("pagehide", () => {

    saveActiveWikiTabScroll();
    persistWikiTabs();

});

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
