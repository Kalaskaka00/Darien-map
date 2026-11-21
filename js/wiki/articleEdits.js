const WIKI_ARTICLE_EDITS_TABLE = "darien_wiki_article_edits";
const wikiArticleEditsSupabase = typeof pingRealtime !== "undefined" ? pingRealtime : null;
const wikiArticleEditButton = document.getElementById("wiki-edit-article");
const wikiWriteAid = document.getElementById("wiki-write-aid");
const wikiWriteAidToggle = document.getElementById("wiki-write-aid-toggle");
const wikiWriteAidBody = document.getElementById("wiki-write-aid-body");
let wikiArticleEditsChannel = null;
let wikiWriteAidMarkup = null;
const wikiWriteAidExpandedKey = "darien-map-write-aid-expanded";
const wikiLinkSuggestions = document.createElement("div");
let wikiLinkSuggestionItems = [];
let wikiLinkSuggestionIndex = -1;
let wikiLinkSuggestionTextarea = null;
let wikiLinkTriggerStart = -1;

wikiLinkSuggestions.className = "wiki-link-suggestions";
wikiLinkSuggestions.id = "wiki-link-suggestions";
wikiLinkSuggestions.setAttribute("role", "listbox");
wikiLinkSuggestions.hidden = true;
document.body.append(wikiLinkSuggestions);

function stripWikiArticleGMNotes(markdown){
    return replaceWikiArticleGMNotes(
        markdown.replace(/\r\n/g, "\n"),
        () => ""
    );
}

function mergeWikiArticleRevision(localMarkdown, proposedMarkdown){
    const gmSections = [];
    replaceWikiArticleGMNotes(
        localMarkdown.replace(/\r\n/g, "\n"),
        match => {
            gmSections.push(match);
            return "";
        }
    );
    const publicMarkdown = stripWikiArticleGMNotes(proposedMarkdown).trimEnd();
    return gmSections.length
        ? `${publicMarkdown}\n\n${gmSections.join("\n\n")}\n`
        : `${publicMarkdown}\n`;
}

function hasWikiArticleGMNotes(markdown){
    let hasNotes = false;
    replaceWikiArticleGMNotes(markdown, match => {
        hasNotes = true;
        return match;
    });
    return hasNotes;
}

async function loadWikiArticleRevision(articleFile, expectedArticle){
    if(!wikiArticleEditsSupabase)
        return {revision: null, error: new Error("Shared article editing is unavailable without a Supabase connection.")};

    let result;
    try{
        result = await wikiArticleEditsSupabase
            .from(WIKI_ARTICLE_EDITS_TABLE)
            .select("article_file, proposed_markdown, base_markdown, proposed_by, submitted_at, status")
            .eq("article_file", articleFile)
            .maybeSingle();
    }catch(error){
        console.error("Could not load shared article changes:", error);
        return {revision: null, error};
    }

    const {data, error} = result;

    if(error){
        console.error("Could not load shared article changes:", error);
        return {revision: null, error};
    }

    if(!data)
        return {revision: null, error: null};

    const proposedArticle = extractFrontmatter(data.proposed_markdown).data;
    const submittedByGM = data.proposed_by === "GM";
    const expectedCategory = expectedArticle.category === "Unknown"
        ? undefined
        : expectedArticle.category;
    if(
        proposedArticle.category !== expectedCategory ||
        (!submittedByGM && proposedArticle.player !== expectedArticle.player) ||
        hasWikiArticleGMNotes(data.proposed_markdown)
    ){
        const invalidRevisionError = new Error(`The shared revision for "${articleFile}" is invalid.`);
        console.error(invalidRevisionError);
        return {revision: null, error: invalidRevisionError};
    }

    return {revision: data, error: null};
}

function formatWikiArticleEditDate(value){
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
        ? date.toISOString().slice(0, 10)
        : "date unknown";
}

function getWikiArticleEditDiff(baseMarkdown, proposedMarkdown){
    const baseContent = extractFrontmatter(stripWikiArticleGMNotes(baseMarkdown)).content;
    const proposedContent = extractFrontmatter(stripWikiArticleGMNotes(proposedMarkdown)).content;
    const baseLines = baseContent.split("\n");
    const proposedLines = proposedContent.split("\n");
    let prefixLength = 0;
    while(prefixLength < baseLines.length &&
        prefixLength < proposedLines.length &&
        baseLines[prefixLength] === proposedLines[prefixLength])
        prefixLength++;

    let baseEnd = baseLines.length;
    let proposedEnd = proposedLines.length;
    while(baseEnd > prefixLength &&
        proposedEnd > prefixLength &&
        baseLines[baseEnd - 1] === proposedLines[proposedEnd - 1]){
        baseEnd--;
        proposedEnd--;
    }

    const removedLines = baseLines.slice(prefixLength, baseEnd);
    const addedLines = proposedLines.slice(prefixLength, proposedEnd);
    const columns = addedLines.length + 1;
    const cellCount = (removedLines.length + 1) * columns;
    let operations = [];

    if(cellCount <= 1000000){
        const lengths = new Uint32Array(cellCount);
        for(let removedIndex = removedLines.length - 1; removedIndex >= 0; removedIndex--){
            for(let addedIndex = addedLines.length - 1; addedIndex >= 0; addedIndex--){
                const cell = removedIndex * columns + addedIndex;
                lengths[cell] = removedLines[removedIndex] === addedLines[addedIndex]
                    ? lengths[cell + columns + 1] + 1
                    : Math.max(lengths[cell + columns], lengths[cell + 1]);
            }
        }

        let removedIndex = 0;
        let addedIndex = 0;
        while(removedIndex < removedLines.length && addedIndex < addedLines.length){
            if(removedLines[removedIndex] === addedLines[addedIndex]){
                removedIndex++;
                addedIndex++;
            }else if(lengths[(removedIndex + 1) * columns + addedIndex] >=
                lengths[removedIndex * columns + addedIndex + 1]){
                operations.push({type: "removed", line: removedLines[removedIndex++]});
            }else{
                operations.push({type: "added", line: addedLines[addedIndex++]});
            }
        }
        while(removedIndex < removedLines.length)
            operations.push({type: "removed", line: removedLines[removedIndex++]});
        while(addedIndex < addedLines.length)
            operations.push({type: "added", line: addedLines[addedIndex++]});
    }else{
        operations = [
            ...removedLines.map(line => ({type: "removed", line})),
            ...addedLines.map(line => ({type: "added", line}))
        ];
    }

    return operations;
}

function renderWikiArticleChangeLog(revision){
    if(revision?.status !== "pending" || typeof revision.base_markdown !== "string")
        return null;

    const changes = getWikiArticleEditDiff(
        revision.base_markdown,
        revision.proposed_markdown
    );
    if(!changes.length)
        return null;

    const changelog = document.createElement("section");
    changelog.className = "wiki-article-changelog";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = "View changelog";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "wiki-article-changelog-details");

    const details = document.createElement("div");
    details.id = "wiki-article-changelog-details";
    details.className = "wiki-article-changelog-details";
    details.hidden = true;
    const visibleChanges = changes.slice(0, 500);
    let activeType = null;
    let activeLines = [];
    const flush = () => {
        if(!activeLines.length)
            return;
        const block = document.createElement("pre");
        block.className = `wiki-article-changelog-${activeType}`;
        const prefix = activeType === "removed" ? "- " : "+ ";
        block.textContent = activeLines.map(line => `${prefix}${line}`).join("\n");
        details.append(block);
        activeLines = [];
    };

    visibleChanges.forEach(change => {
        if(change.type !== activeType){
            flush();
            activeType = change.type;
        }
        activeLines.push(change.line);
    });
    flush();
    if(changes.length > visibleChanges.length){
        const note = document.createElement("p");
        note.textContent = `Showing the first ${visibleChanges.length} of ${changes.length} changed lines.`;
        details.append(note);
    }

    toggle.addEventListener("click", () => {
        details.hidden = !details.hidden;
        toggle.setAttribute("aria-expanded", String(!details.hidden));
        toggle.textContent = details.hidden ? "View changelog" : "Hide changelog";
    });
    changelog.append(toggle, details);
    return changelog;
}

function canEditWikiArticle(article, revisionState){
    return Boolean(article && (
        isGM ||
        (currentPlayer && revisionState?.revision?.status !== "approved")
    ));
}

function isValidWikiArticleEdit(article, markdown){
    if(!isGM && !currentPlayer)
        return false;

    const parsed = extractFrontmatter(markdown);
    const expectedCategory = article.category === "Unknown" ? undefined : article.category;
    return parsed.data.category === expectedCategory &&
        (isGM || parsed.data.player === article.player) &&
        !hasWikiArticleGMNotes(markdown);
}

function updateWikiArticleEditButton(article, revisionState){
    if(!wikiArticleEditButton)
        return;

    wikiArticleEditButton.hidden = !canEditWikiArticle(article, revisionState);
}

function renderWikiArticleEditControls(article, markdown, revisionState){
    const articleElement = document.getElementById("article");
    const controls = document.createElement("section");
    controls.className = "wiki-article-edit-controls";

    const revision = revisionState?.revision;
    const status = document.createElement("p");
    status.className = "wiki-article-edit-status";
    status.setAttribute("role", "status");
    const hasStatus = Boolean(revision || revisionState?.error);
    status.hidden = !hasStatus;

    if(revision){
        const stateLabel = revision.status === "approved"
            ? "approved and waiting for upload"
            : "submitted for review";
        status.textContent = `${revision.proposed_by} made changes to ${article.fullname || article.name} on ${formatWikiArticleEditDate(revision.submitted_at)}. Changes are visible now; this revision is ${stateLabel}.`;
    }else if(revisionState?.error){
        status.textContent = "Could not check for shared changes. Showing the published article.";
        status.classList.add("wiki-article-edit-error");
    }

    controls.append(status);
    controls.hidden = !hasStatus;

    const canEdit = canEditWikiArticle(article, revisionState);
    const changelog = renderWikiArticleChangeLog(revision);
    if(changelog)
        controls.append(changelog);

    if(canEdit){
        const form = document.createElement("form");
        form.className = "wiki-article-edit-form";
        form.hidden = true;

        const label = document.createElement("label");
        label.textContent = "Edit this article (GM-only notes are kept private):";

        const textarea = document.createElement("textarea");
        textarea.spellcheck = false;
        textarea.setAttribute("aria-autocomplete", "list");
        textarea.setAttribute("aria-controls", wikiLinkSuggestions.id);
        textarea.setAttribute("aria-expanded", "false");
        textarea.value = stripWikiArticleGMNotes(markdown);
        label.append(textarea);

        const formStatus = document.createElement("p");
        formStatus.className = "wiki-article-edit-form-status";
        formStatus.setAttribute("role", "status");

        const submit = document.createElement("button");
        submit.type = "submit";
        submit.textContent = "Submit changes";

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.textContent = "Cancel";

        const editor = document.createElement("div");
        editor.className = "wiki-article-edit-input";
        const actions = document.createElement("div");
        actions.className = "wiki-article-edit-actions";
        actions.append(submit, cancel, formStatus);
        editor.append(label, actions);
        form.append(editor);
        controls.append(form);

        textarea.addEventListener("input", () => updateWikiLinkSuggestions(textarea));
        textarea.addEventListener("click", () => updateWikiLinkSuggestions(textarea));
        textarea.addEventListener("scroll", () => {
            if(!wikiLinkSuggestions.hidden)
                positionWikiLinkSuggestions(textarea, textarea.selectionStart);
        });
        textarea.addEventListener("keyup", event => {
            if(!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key))
                updateWikiLinkSuggestions(textarea);
        });
        textarea.addEventListener("keydown", event => handleWikiLinkSuggestionKeydown(event, textarea));
        textarea.addEventListener("blur", () => {
            window.setTimeout(() => {
                if(document.activeElement !== wikiLinkSuggestions)
                    hideWikiLinkSuggestions();
            }, 0);
        });

        cancel.addEventListener("click", () => {
            form.hidden = true;
            formStatus.textContent = "";
            controls.hidden = !hasStatus;
            hideWikiWriteAid();
            hideWikiLinkSuggestions();
        });

        form.addEventListener("submit", async event => {
            event.preventDefault();
            const proposedMarkdown = textarea.value;
            if(!isValidWikiArticleEdit(article, proposedMarkdown)){
                formStatus.textContent = "The article type and player assignment cannot be changed, and GM-only notes cannot be submitted.";
                formStatus.classList.add("wiki-article-edit-error");
                return;
            }
            if(!wikiArticleEditsSupabase){
                formStatus.textContent = "Could not submit changes because the shared database is unavailable.";
                formStatus.classList.add("wiki-article-edit-error");
                return;
            }

            submit.disabled = true;
            formStatus.classList.remove("wiki-article-edit-error");
            formStatus.textContent = "Submitting changes...";
            let submissionError;
            try{
                const result = await wikiArticleEditsSupabase
                    .from(WIKI_ARTICLE_EDITS_TABLE)
                    .upsert({
                        article_file: article.file,
                        proposed_markdown: stripWikiArticleGMNotes(proposedMarkdown),
                        base_markdown: stripWikiArticleGMNotes(
                            revisionState.revision?.status === "pending"
                                ? revisionState.revision.base_markdown
                                : markdown
                        ),
                        proposed_by: isGM ? "GM" : currentPlayer,
                        submitted_at: new Date().toISOString(),
                        status: "pending"
                    }, {onConflict: "article_file"});
                submissionError = result.error;
            }catch(error){
                submissionError = error;
            }

            submit.disabled = false;
            if(submissionError){
                console.error("Could not submit article changes:", submissionError);
                formStatus.textContent = "Changes could not be submitted. Check the shared database connection and try again.";
                formStatus.classList.add("wiki-article-edit-error");
                return;
            }

            await loadArticle(article.file);
            hideWikiWriteAid();
            hideWikiLinkSuggestions();
        });
    }

    articleElement.append(controls);
}

function replaceWikiArticleGMNotes(markdown, replaceBlock){
    const codeBlocks = [];
    const placeholder = index => `\u0000WIKI_EDIT_CODE_${index}\u0000`;
    const maskCode = code => {
        const index = codeBlocks.push(code) - 1;
        return placeholder(index);
    };

    let protectedMarkdown = markdown.replace(
        /(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)/g,
        maskCode
    );
    protectedMarkdown = protectedMarkdown.replace(
        /(`+)(?:\\.|[^`])*?\1/g,
        maskCode
    );
    protectedMarkdown = protectedMarkdown.replace(
        /<!--GM([\s\S]*?)-->/g,
        (match, content) => replaceBlock(match, content)
    );

    return protectedMarkdown.replace(
        /\u0000WIKI_EDIT_CODE_(\d+)\u0000/g,
        (_, index) => codeBlocks[Number(index)]
    );
}

function updateWikiLinkSuggestions(textarea){
    const cursor = textarea.selectionStart;
    const prefix = textarea.value.slice(0, cursor);
    const trigger = prefix.match(/\[\[([^\[\]\r\n]*)$/);
    if(!trigger || !trigger[1].trim()){
        hideWikiLinkSuggestions();
        return;
    }

    const query = trigger[1].trim().toLocaleLowerCase();
    const articleNames = [...new Set(
        world
            .filter(article => article.name && canReadArticle(article))
            .map(article => article.name)
    )];
    wikiLinkSuggestionItems = articleNames
        .filter(name => name.toLocaleLowerCase().includes(query))
        .sort((first, second) => {
            const firstStarts = first.toLocaleLowerCase().startsWith(query);
            const secondStarts = second.toLocaleLowerCase().startsWith(query);
            if(firstStarts !== secondStarts)
                return firstStarts ? -1 : 1;
            return first.localeCompare(second);
        })
        .slice(0, 8);

    if(!wikiLinkSuggestionItems.length){
        hideWikiLinkSuggestions();
        return;
    }

    wikiLinkSuggestionTextarea = textarea;
    wikiLinkTriggerStart = cursor - trigger[0].length;
    wikiLinkSuggestionIndex = -1;
    wikiLinkSuggestions.replaceChildren(...wikiLinkSuggestionItems.map((name, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.id = `wiki-link-suggestion-${index}`;
        option.className = "wiki-link-suggestion";
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        option.textContent = name;
        option.addEventListener("mousedown", event => event.preventDefault());
        option.addEventListener("click", () => completeWikiLinkSuggestion(index));
        return option;
    }));

    positionWikiLinkSuggestions(textarea, cursor);
    wikiLinkSuggestions.hidden = false;
    textarea.setAttribute("aria-expanded", "true");
}

function positionWikiLinkSuggestions(textarea, cursor){
    const textareaRect = textarea.getBoundingClientRect();
    const style = getComputedStyle(textarea);
    const mirror = document.createElement("div");
    const copiedStyles = [
        "boxSizing", "fontFamily", "fontSize", "fontWeight", "fontStyle",
        "lineHeight", "letterSpacing", "textTransform", "textIndent",
        "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
        "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
        "whiteSpace", "wordBreak", "overflowWrap", "tabSize"
    ];

    copiedStyles.forEach(property => {
        mirror.style[property] = style[property];
    });
    mirror.style.position = "fixed";
    mirror.style.visibility = "hidden";
    mirror.style.left = `${textareaRect.left - textarea.scrollLeft}px`;
    mirror.style.top = `${textareaRect.top - textarea.scrollTop}px`;
    mirror.style.width = `${textareaRect.width}px`;
    mirror.style.height = "auto";
    mirror.style.minHeight = "0";
    mirror.style.maxHeight = "none";
    mirror.style.overflow = "visible";
    mirror.textContent = textarea.value.slice(0, cursor);

    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    mirror.append(marker);
    document.body.append(mirror);
    const markerRect = marker.getBoundingClientRect();
    mirror.remove();

    const popupWidth = Math.min(320, window.innerWidth - 24);
    const left = Math.max(12, Math.min(markerRect.left, window.innerWidth - popupWidth - 12));
    const top = Math.max(12, Math.min(markerRect.bottom + 4, window.innerHeight - 230));
    wikiLinkSuggestions.style.left = `${left}px`;
    wikiLinkSuggestions.style.top = `${top}px`;
    wikiLinkSuggestions.style.width = `${popupWidth}px`;
}

function setWikiLinkSuggestionSelection(index){
    if(index < 0 || index >= wikiLinkSuggestionItems.length)
        return;

    wikiLinkSuggestionIndex = index;
    wikiLinkSuggestionTextarea?.setAttribute(
        "aria-activedescendant",
        `wiki-link-suggestion-${index}`
    );
    [...wikiLinkSuggestions.children].forEach((option, optionIndex) => {
        const selected = optionIndex === index;
        option.setAttribute("aria-selected", String(selected));
        if(selected)
            option.scrollIntoView({block: "nearest"});
    });
}

function completeWikiLinkSuggestion(index){
    const textarea = wikiLinkSuggestionTextarea;
    const name = wikiLinkSuggestionItems[index];
    if(!textarea || !name)
        return;

    const suffix = textarea.value.slice(textarea.selectionEnd);
    const closingBrackets = suffix.startsWith("]]") ? 2 : 0;
    const link = `[[${name}]]`;
    textarea.setRangeText(
        link,
        wikiLinkTriggerStart,
        textarea.selectionEnd + closingBrackets,
        "end"
    );
    textarea.focus();
    textarea.dispatchEvent(new Event("input", {bubbles: true}));
    textarea.setSelectionRange(
        wikiLinkTriggerStart + link.length,
        wikiLinkTriggerStart + link.length
    );
    hideWikiLinkSuggestions();
}

function handleWikiLinkSuggestionKeydown(event, textarea){
    if(wikiLinkSuggestions.hidden || wikiLinkSuggestionTextarea !== textarea)
        return;

    if(event.key === "ArrowDown"){
        event.preventDefault();
        const nextIndex = wikiLinkSuggestionIndex < 0
            ? 0
            : (wikiLinkSuggestionIndex + 1) % wikiLinkSuggestionItems.length;
        setWikiLinkSuggestionSelection(nextIndex);
    }else if(event.key === "ArrowUp"){
        event.preventDefault();
        const previousIndex = wikiLinkSuggestionIndex < 0
            ? wikiLinkSuggestionItems.length - 1
            : (wikiLinkSuggestionIndex - 1 + wikiLinkSuggestionItems.length) % wikiLinkSuggestionItems.length;
        setWikiLinkSuggestionSelection(previousIndex);
    }else if(event.key === "Enter" && wikiLinkSuggestionIndex >= 0){
        event.preventDefault();
        completeWikiLinkSuggestion(wikiLinkSuggestionIndex);
    }else if(event.key === "Escape"){
        event.preventDefault();
        hideWikiLinkSuggestions();
    }
}

function hideWikiLinkSuggestions(){
    if(wikiLinkSuggestionTextarea){
        wikiLinkSuggestionTextarea.setAttribute("aria-expanded", "false");
        wikiLinkSuggestionTextarea.removeAttribute("aria-activedescendant");
    }
    wikiLinkSuggestions.hidden = true;
    wikiLinkSuggestions.replaceChildren();
    wikiLinkSuggestionItems = [];
    wikiLinkSuggestionIndex = -1;
    wikiLinkSuggestionTextarea = null;
    wikiLinkTriggerStart = -1;
}

window.addEventListener("scroll", () => {
    if(!wikiLinkSuggestions.hidden && wikiLinkSuggestionTextarea)
        positionWikiLinkSuggestions(
            wikiLinkSuggestionTextarea,
            wikiLinkSuggestionTextarea.selectionStart
        );
}, true);

async function loadWikiWriteAid(aid){
    const status = aid.querySelector(".wiki-write-aid-status");
    const content = aid.querySelector(".wiki-write-aid-content");
    if(content.dataset.loaded === "true")
        return;

    status.hidden = false;
    status.classList.remove("wiki-article-edit-error");
    status.textContent = "Loading writing guide...";

    try{
        if(!wikiWriteAidMarkup){
            const response = await fetch("wiki/Write%20Aid.md");
            if(!response.ok)
                throw new Error(`Unable to load Write Aid: ${response.status}`);
            const markdown = await response.text();
            wikiWriteAidMarkup = marked.parse(markdown);
        }

        content.innerHTML = wikiWriteAidMarkup;
        status.hidden = true;
        content.dataset.loaded = "true";
    }catch(error){
        console.error("Could not load wiki Write Aid:", error);
        status.textContent = "Could not load Write Aid. Check your connection and try again.";
        status.classList.add("wiki-article-edit-error");
    }
}

wikiArticleEditButton?.addEventListener("click", () => {
    const form = document.querySelector("#article .wiki-article-edit-form");
    const textarea = form?.querySelector("textarea");
    if(!form || !textarea)
        return;

    form.closest(".wiki-article-edit-controls").hidden = false;
    form.hidden = false;
    showWikiWriteAid();
    form.scrollIntoView({behavior: "smooth", block: "center"});
    textarea.focus();
});

function showWikiWriteAid(){
    if(!wikiWriteAid)
        return;

    wikiWriteAid.hidden = false;
    loadWikiWriteAid(wikiWriteAid);
}

function hideWikiWriteAid(){
    if(wikiWriteAid)
        wikiWriteAid.hidden = true;
}

function setWikiWriteAidExpanded(expanded){
    if(!wikiWriteAid || !wikiWriteAidToggle || !wikiWriteAidBody)
        return;

    wikiWriteAid.classList.toggle("wiki-write-aid-minimized", !expanded);
    wikiWriteAidBody.hidden = !expanded;
    wikiWriteAidToggle.setAttribute("aria-expanded", String(expanded));
    wikiWriteAidToggle.setAttribute(
        "aria-label",
        expanded ? "Minimize Write Aid" : "Expand Write Aid"
    );
    wikiWriteAidToggle.textContent = expanded ? "−" : "+";
    localStorage.setItem(wikiWriteAidExpandedKey, String(expanded));
}

if(wikiWriteAidToggle){
    let writeAidExpanded = localStorage.getItem(wikiWriteAidExpandedKey) !== "false";
    setWikiWriteAidExpanded(writeAidExpanded);
    wikiWriteAidToggle.addEventListener("click", () => {
        writeAidExpanded = !writeAidExpanded;
        setWikiWriteAidExpanded(writeAidExpanded);
    });
}

async function refreshOpenWikiArticle(articleFile){
    const currentArticle = getCurrentArticle();
    const hasSummary = currentArticle?.category === "summary" ||
        document.querySelector("#article .pc-summary-cards");
    if(!currentArticle ||
        (currentArticle.file !== articleFile && !hasSummary))
        return;

    delete articleCache[articleFile];
    await loadArticle(currentArticle.file);
}

function initializeWikiArticleEdits(){
    if(!wikiArticleEditsSupabase){
        console.warn("Shared article editing is unavailable without Supabase.");
        return;
    }

    wikiArticleEditsChannel = wikiArticleEditsSupabase
        .channel(`${CONFIG.map.realtime.room || "darien-map"}-wiki-article-edits`)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: WIKI_ARTICLE_EDITS_TABLE
        }, payload => {
            const articleFile = payload.new?.article_file || payload.old?.article_file;
            if(articleFile)
                refreshOpenWikiArticle(articleFile);
        });

    wikiArticleEditsChannel.subscribe(status => {
        if(status !== "SUBSCRIBED")
            console.warn("Wiki article edit realtime status:", status);
    });
}

initializeWikiArticleEdits();
