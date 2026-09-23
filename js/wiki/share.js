const wikiShowArticleButton = document.getElementById("wiki-show-article");
const wikiShareDialog = document.getElementById("wiki-share-dialog");
const wikiShareEventName = "wiki-share-article";
const wikiShareSenderId = sessionStorage.getItem("wiki-share-sender-id") || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

sessionStorage.setItem("wiki-share-sender-id", wikiShareSenderId);

let wikiShareRealtime = null;
let wikiShareChannel = null;

function escapeWikiShareHTML(value){

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

function isPublicArticle(article){

    return !article.visibility || article.visibility === "everyone";

}

function closeWikiShareDialog(){

    wikiShareDialog.hidden = true;
    wikiShareDialog.innerHTML = "";

}

function showWikiShareDialog(content){

    wikiShareDialog.innerHTML = content;
    wikiShareDialog.hidden = false;

}

function publishSharedArticle(article, recipients){

    const message = {
        articleFile: article.file,
        recipients,
        senderId: wikiShareSenderId
    };

    if(wikiShareRealtime){
        wikiShareChannel.send({
            type: "broadcast",
            event: wikiShareEventName,
            payload: message
        });
    }else if(wikiShareChannel){
        wikiShareChannel.postMessage(message);
    }else{
        localStorage.setItem(wikiShareEventName, JSON.stringify(message));
    }

    closeWikiShareDialog();

}

function getSelectedSharePlayers(){

    return [...wikiShareDialog.querySelectorAll("input[name='wiki-share-player']:checked")]
        .map(input => input.value);

}

function confirmHiddenArticleShare(article, recipients){

    const visibleRecipients = (recipients || Object.keys(CONFIG.players)).filter(playerName =>
        canReadArticleForPlayer(article, playerName, false)
    );
    const recipientLabel = recipients?.length ? recipients.join(", ") : "everyone";

    showWikiShareDialog(`
        <div class="wiki-share-panel" role="dialog" aria-modal="true" aria-labelledby="wiki-share-title">
            <h2 id="wiki-share-title">Show hidden article?</h2>
            <p>This article is hidden from at least one selected player (${escapeWikiShareHTML(recipientLabel)}).</p>
            <div class="wiki-share-actions">
                <button type="button" data-share-choice="all">Yes, show the article</button>
                <button type="button" data-share-choice="visible">Only show it to players who can already view it</button>
                <button type="button" data-share-choice="cancel">Nevermind</button>
            </div>
        </div>
    `);

    wikiShareDialog.querySelectorAll("[data-share-choice]").forEach(button => {
        button.addEventListener("click", () => {
            const choice = button.dataset.shareChoice;

            if(choice === "all")
                publishSharedArticle(article, recipients);
            else if(choice === "visible")
                publishSharedArticle(article, visibleRecipients);
            else
                closeWikiShareDialog();
        });
    });

}

function shareCurrentArticle(article, recipients){

    if(!article || !article.file || !canReadArticle(article))
        return;

    if(!isGM && !isPublicArticle(article)){
        window.alert("Players cannot show hidden articles.");
        return;
    }

    if(isGM && !isPublicArticle(article)){
        confirmHiddenArticleShare(article, recipients);
        return;
    }

    publishSharedArticle(article, recipients);

}

function openShareRecipientDialog(article){

    const playerOptions = Object.keys(CONFIG.players).map(playerName => `
        <label class="wiki-share-player">
            <input type="checkbox" name="wiki-share-player" value="${escapeWikiShareHTML(playerName)}">
            <span>${escapeWikiShareHTML(playerName)}</span>
        </label>
    `).join("");

    showWikiShareDialog(`
        <div class="wiki-share-panel" role="dialog" aria-modal="true" aria-labelledby="wiki-share-title">
            <h2 id="wiki-share-title">Show article</h2>
            <p>Choose which players should open this article in a new wiki tab.</p>
            <div class="wiki-share-players">${playerOptions}</div>
            <div class="wiki-share-actions">
                <button type="button" data-share-submit>Show article</button>
                <button type="button" data-share-cancel>Cancel</button>
            </div>
        </div>
    `);

    wikiShareDialog.querySelector("[data-share-submit]").addEventListener("click", () => {
        shareCurrentArticle(article, getSelectedSharePlayers());
    });
    wikiShareDialog.querySelector("[data-share-cancel]").addEventListener("click", closeWikiShareDialog);

}

function handleSharedArticle(event){

    const message = event.payload || event.data || JSON.parse(event.newValue || "null");

    if(!message || message.senderId === wikiShareSenderId || !message.articleFile)
        return;

    if(isGM || !currentPlayer || (message.recipients && !message.recipients.includes(currentPlayer)))
        return;

    const article = getArticleByFile(message.articleFile);

    if(!article || !canReadArticle(article))
        return;

    openArticleInNewTab(article);

}

function initializeWikiShare(){

    const realtimeConfig = CONFIG.map.realtime;

    if(window.supabase && realtimeConfig?.url && realtimeConfig?.key){
        wikiShareRealtime = window.supabase.createClient(realtimeConfig.url, realtimeConfig.key);
        wikiShareChannel = wikiShareRealtime
            .channel(`${realtimeConfig.room || "darien-map"}-wiki-share`)
            .on("broadcast", {event: wikiShareEventName}, handleSharedArticle);
        wikiShareChannel.subscribe();
    }else if("BroadcastChannel" in window){
        wikiShareChannel = new BroadcastChannel(wikiShareEventName);
        wikiShareChannel.addEventListener("message", handleSharedArticle);
    }else{
        window.addEventListener("storage", event => {
            if(event.key === wikiShareEventName)
                handleSharedArticle(event);
        });
    }

    wikiShowArticleButton.addEventListener("click", event => {
        const article = getCurrentArticle();

        if(!article)
            return;

        if(event.shiftKey){
            shareCurrentArticle(article, null);
            return;
        }

        openShareRecipientDialog(article);
    });
    wikiShareDialog.addEventListener("click", event => {
        if(event.target === wikiShareDialog)
            closeWikiShareDialog();
    });

}

initializeWikiShare();