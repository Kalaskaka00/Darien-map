const wikiShowArticleButton = document.getElementById("wiki-show-article");
const wikiShareDialog = document.getElementById("wiki-share-dialog");
const wikiShareEventName = "wiki-share-article";
const wikiGMRecipient = "__GM__";
const wikiShareSenderId = sessionStorage.getItem("wiki-share-sender-id") || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

sessionStorage.setItem("wiki-share-sender-id", wikiShareSenderId);

let wikiShareRealtime = null;
let wikiShareChannel = null;
let wikiShareChannelStatus = "joining";

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

async function publishSharedArticle(article, recipients, allowRestricted = false){

    const message = {
        articleFile: article.file,
        recipients,
        senderId: wikiShareSenderId,
        allowRestricted
    };

    try{

        if(wikiShareRealtime){
            if(wikiShareChannelStatus !== "SUBSCRIBED"){
                window.alert("Article was not sent because the realtime connection is not ready.");
                return;
            }

            const status = await wikiShareChannel.send({
                type: "broadcast",
                event: wikiShareEventName,
                payload: message
            });

            if(status !== "ok"){
                console.error("Wiki share broadcast failed:", status);
                window.alert("Article could not be sent. Check the realtime connection and try again.");
                return;
            }
        }else if(wikiShareChannel){
            wikiShareChannel.postMessage(message);
        }else{
            localStorage.setItem(wikiShareEventName, JSON.stringify(message));
        }

    }catch(error){

        console.error("Wiki share broadcast failed:", error);
        window.alert("Article could not be sent. Check the realtime connection and try again.");
        return;

    }

    closeWikiShareDialog();

}

function getSelectedSharePlayers(){

    return [...wikiShareDialog.querySelectorAll("input[name='wiki-share-player']:checked")]
        .map(input => input.value);

}

function confirmHiddenArticleShare(article, recipients){

    const recipientOptions = recipients || [...Object.keys(CONFIG.players), wikiGMRecipient];
    const visibleRecipients = recipientOptions.filter(recipient =>
        recipient === wikiGMRecipient || canReadArticleForPlayer(article, recipient, false)
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
                publishSharedArticle(article, recipients, true);
            else if(choice === "visible")
                publishSharedArticle(article, visibleRecipients);
            else
                closeWikiShareDialog();
        });
    });

}

function shareCurrentArticle(article, recipients){

    if(!article || !article.file)
        return;

    const activeTab = getActiveWikiTab();
    const canShareArticle = canReadArticle(article) || activeTab?.sharedAccess;

    if(!canShareArticle)
        return;

    if(isGM && !isPublicArticle(article)){
        confirmHiddenArticleShare(article, recipients);
        return;
    }

    publishSharedArticle(article, recipients, !isPublicArticle(article));

}

function openShareRecipientDialog(article){

    const recipients = [
        ...Object.keys(CONFIG.players)
            .filter(playerName => isGM || playerName !== currentPlayer)
            .map(playerName => ({value: playerName, label: playerName})),
        ...(!isGM ? [{value: wikiGMRecipient, label: "GM"}] : [])
    ];
    const playerOptions = recipients.map(({value, label}) => `
        <label class="wiki-share-player">
            <input type="checkbox" name="wiki-share-player" value="${escapeWikiShareHTML(value)}">
            <span>${escapeWikiShareHTML(label)}</span>
        </label>
    `).join("");

    showWikiShareDialog(`
        <div class="wiki-share-panel" role="dialog" aria-modal="true" aria-labelledby="wiki-share-title">
            <h2 id="wiki-share-title">Show article</h2>
            <p>Choose who should open this article in a new wiki tab.</p>
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

    const addressedToGM = isGM && (
        message.recipients === null || message.recipients?.includes(wikiGMRecipient)
    );
    const addressedToPlayer = !isGM && currentPlayer && (
        message.recipients === null || message.recipients?.includes(currentPlayer)
    );

    if(!addressedToGM && !addressedToPlayer)
        return;

    const article = getArticleByFile(message.articleFile);

    if(!article || (!canReadArticle(article) && !message.allowRestricted))
        return;

    openArticleInNewTab(article, Boolean(message.allowRestricted));

}

function initializeWikiShare(){

    const realtimeConfig = CONFIG.map.realtime;

    if(pingRealtime && realtimeConfig?.url && realtimeConfig?.key){
        wikiShareRealtime = pingRealtime;
        wikiShareChannel = wikiShareRealtime
            .channel(`${realtimeConfig.room || "darien-map"}-wiki-share`)
            .on("broadcast", {event: wikiShareEventName}, handleSharedArticle);
        wikiShareChannel.subscribe(status => {
            wikiShareChannelStatus = status;
            if(status !== "SUBSCRIBED")
                console.warn("Wiki share realtime status:", status);
        });
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