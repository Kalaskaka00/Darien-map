const notepadToggle = document.getElementById("notepad-toggle");
const notepadPanel = document.getElementById("notepad-panel");
const notepadClose = document.getElementById("notepad-close");
const notepadExpand = document.getElementById("notepad-expand");
const notepadOwnerLabel = document.getElementById("notepad-owner");
const notepadOwnerPickerWrap = document.getElementById("notepad-owner-picker-wrap");
const notepadOwnerPicker = document.getElementById("notepad-owner-picker");
const notepadTabs = document.getElementById("notepad-tabs");
const notepadContent = document.getElementById("notepad-content");
const notepadView = document.getElementById("notepad-view");
const notepadEditor = document.getElementById("notepad-editor");
const notepadLinkSuggestions = document.getElementById("notepad-link-suggestions");
const notepadSaveStatus = document.getElementById("notepad-save-status");
const notepadArticleName = document.getElementById("notepad-article-name");
const notepadArticleList = document.getElementById("notepad-article-list");
const notepadAddButton = document.getElementById("notepad-add");
const notepadRenameButton = document.getElementById("notepad-rename");
const notepadDeleteButton = document.getElementById("notepad-delete");
const notepadEditButton = document.getElementById("notepad-edit");
const notepadDoneButton = document.getElementById("notepad-done");
const notepadAddLinkButton = document.getElementById("notepad-add-link");
const NOTEPAD_STORAGE_PREFIX = "darien-map-notepad:";
const NOTEPAD_EXPANDED_STORAGE_KEY = "darien-map-notepad-expanded";

let notepadViewedOwner = null;
let notepadState = null;
let notepadStorageError = false;
let notepadDataInvalid = false;
let notepadEditing = false;
let notepadSuggestionIndex = -1;
let notepadPreferenceError = false;

function getNotepadStorageKey(owner) {
    return `${NOTEPAD_STORAGE_PREFIX}${encodeURIComponent(owner)}`;
}

function createNotepadState() {
    const note = {id: createNotepadId(), title: "Note 1", content: ""};
    return {activeNoteId: note.id, notes: [note]};
}

function createNotepadId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getNotepadOwner() {
    if(isGM)
        return notepadOwnerPicker.value || "GM";

    return currentPlayer || null;
}

function isNotepadReadOnly() {
    return isGM && notepadViewedOwner !== "GM";
}

function setNotepadStatus(message, isError = false) {
    notepadSaveStatus.textContent = message;
    notepadSaveStatus.style.color = isError ? "#9b1c1c" : "";
}

function normalizeNotepadState(state) {
    if(!state || !Array.isArray(state.notes))
        return null;

    const notes = state.notes.filter(note =>
        note &&
        typeof note.id === "string" &&
        typeof note.title === "string" &&
        typeof note.content === "string"
    );

    if(notes.length === 0)
        return null;

    return {
        activeNoteId: notes.some(note => note.id === state.activeNoteId)
            ? state.activeNoteId
            : notes[0].id,
        notes
    };
}

function loadNotepad(owner) {
    notepadDataInvalid = false;
    try {
        const saved = localStorage.getItem(getNotepadStorageKey(owner));
        notepadState = saved ? normalizeNotepadState(JSON.parse(saved)) : null;
        if(saved && !notepadState) {
            console.warn("Saved notepad data is invalid; showing a new empty notebook.");
            notepadDataInvalid = true;
        } else {
            notepadDataInvalid = false;
        }
        notepadStorageError = false;
        if(!notepadState)
            notepadState = createNotepadState();
    } catch(error) {
        console.error("Could not load notepad:", error);
        notepadState = createNotepadState();
        notepadStorageError = true;
    }
}

function saveNotepad() {
    if(!notepadState || isNotepadReadOnly() || !notepadViewedOwner)
        return;

    try {
        localStorage.setItem(
            getNotepadStorageKey(notepadViewedOwner),
            JSON.stringify(notepadState)
        );
        notepadStorageError = false;
        notepadDataInvalid = false;
        setNotepadStatus("Saved in this browser");
    } catch(error) {
        console.error("Could not save notepad:", error);
        notepadStorageError = true;
        setNotepadStatus("Could not save. Check browser storage.", true);
    }
}

function getActiveNotepadNote() {
    return notepadState?.notes.find(note => note.id === notepadState.activeNoteId) || null;
}

function renderNotepadView(content) {
    notepadView.replaceChildren();
    const linkPattern = /\[\[([^\]]+)\]\]/g;
    let previousIndex = 0;
    let match;

    while((match = linkPattern.exec(content)) !== null) {
        notepadView.append(document.createTextNode(content.slice(previousIndex, match.index)));

        const [articleName, label] = match[1].split("|").map(value => value.trim());
        const article = getArticle(articleName);
        if(article && canReadArticle(article)) {
            const link = document.createElement("a");
            link.href = "#";
            link.dataset.notepadArticle = article.name;
            link.textContent = label || article.name;
            notepadView.append(link);
        } else {
            notepadView.append(document.createTextNode(match[0]));
        }

        previousIndex = linkPattern.lastIndex;
    }

    notepadView.append(document.createTextNode(content.slice(previousIndex)));
}

function hideNotepadLinkSuggestions() {
    notepadLinkSuggestions.replaceChildren();
    notepadLinkSuggestions.hidden = true;
    notepadSuggestionIndex = -1;
}

function getNotepadLinkQuery() {
    const cursor = notepadContent.selectionStart;
    const textBeforeCursor = notepadContent.value.slice(0, cursor);
    const openingIndex = textBeforeCursor.lastIndexOf("[[");
    if(openingIndex < 0)
        return null;

    const query = textBeforeCursor.slice(openingIndex + 2);
    if(query.includes("]]") || !query.trim())
        return null;

    return {openingIndex, cursor, query: query.trim()};
}

function renderNotepadLinkSuggestions() {
    hideNotepadLinkSuggestions();
    if(!notepadEditing || notepadContent.disabled || typeof world === "undefined")
        return;

    const linkQuery = getNotepadLinkQuery();
    if(!linkQuery)
        return;

    const normalizedQuery = linkQuery.query.toLocaleLowerCase();
    const matches = world
        .filter(article => canReadArticle(article))
        .filter(article => article.name.toLocaleLowerCase().includes(normalizedQuery))
        .sort((first, second) => {
            const firstStartsWith = first.name.toLocaleLowerCase().startsWith(normalizedQuery);
            const secondStartsWith = second.name.toLocaleLowerCase().startsWith(normalizedQuery);
            return Number(secondStartsWith) - Number(firstStartsWith) ||
                first.name.localeCompare(second.name);
        })
        .slice(0, 8);

    if(matches.length === 0)
        return;

    for(const article of matches) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "notepad-link-suggestion";
        option.role = "option";
        option.setAttribute("aria-selected", "false");
        option.textContent = article.name;
        option.addEventListener("mousedown", event => event.preventDefault());
        option.addEventListener("click", () => completeNotepadArticleLink(article.name, linkQuery));
        notepadLinkSuggestions.append(option);
    }

    notepadLinkSuggestions.hidden = false;
}

function completeNotepadArticleLink(articleName, linkQuery = getNotepadLinkQuery()) {
    if(!linkQuery)
        return;

    const before = notepadContent.value.slice(0, linkQuery.openingIndex);
    const after = notepadContent.value.slice(linkQuery.cursor);
    const completedLink = `[[${articleName}]]`;
    const nextCursor = before.length + completedLink.length;
    notepadContent.value = `${before}${completedLink}${after}`;
    notepadContent.setSelectionRange(nextCursor, nextCursor);
    notepadContent.dispatchEvent(new Event("input", {bubbles: true}));
    hideNotepadLinkSuggestions();
    notepadContent.focus();
}

function handleNotepadSuggestionKeys(event) {
    if(notepadLinkSuggestions.hidden)
        return;

    const options = [...notepadLinkSuggestions.querySelectorAll(".notepad-link-suggestion")];
    if(event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        notepadSuggestionIndex = (notepadSuggestionIndex + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length;
        options.forEach((option, index) => {
            option.setAttribute("aria-selected", String(index === notepadSuggestionIndex));
        });
    } else if(event.key === "Enter" && notepadSuggestionIndex >= 0) {
        event.preventDefault();
        options[notepadSuggestionIndex].click();
    } else if(event.key === "Escape") {
        hideNotepadLinkSuggestions();
    }
}

function renderNotepad() {
    const owner = getNotepadOwner();
    notepadOwnerPickerWrap.hidden = !isGM;

    if(isGM) {
        const selectedOwner = notepadOwnerPicker.value || "GM";
        if(notepadViewedOwner !== selectedOwner) {
            notepadViewedOwner = selectedOwner;
            notepadEditing = false;
            loadNotepad(notepadViewedOwner);
        }
        notepadOwnerLabel.textContent = notepadViewedOwner === "GM"
            ? "Your GM notebook"
            : `${notepadViewedOwner}'s notebook (read-only)`;
    } else if(owner) {
        if(notepadViewedOwner !== owner) {
            notepadViewedOwner = owner;
            notepadEditing = false;
            loadNotepad(owner);
        }
        notepadOwnerLabel.textContent = `Your notebook: ${owner}`;
    } else {
        notepadViewedOwner = null;
        notepadState = null;
        notepadEditing = false;
        notepadOwnerLabel.textContent = "Select a player in Player tools to use a personal notebook.";
    }

    const hasNotebook = Boolean(notepadState);
    const readOnly = isNotepadReadOnly() || !hasNotebook;
    notepadTabs.replaceChildren();
    notepadArticleList.replaceChildren();

    if(hasNotebook) {
        for(const note of notepadState.notes) {
            const tab = document.createElement("button");
            tab.type = "button";
            tab.className = "notepad-tab";
            tab.role = "tab";
            tab.setAttribute("aria-selected", String(note.id === notepadState.activeNoteId));
            tab.textContent = note.title;
            tab.addEventListener("click", () => {
                notepadState.activeNoteId = note.id;
                notepadEditing = false;
                saveNotepad();
                renderNotepad();
            });
            notepadTabs.append(tab);
        }
    }

    const note = getActiveNotepadNote();
    notepadContent.value = note?.content || "";
    notepadContent.disabled = readOnly || !note || !notepadEditing;
    notepadAddButton.disabled = readOnly;
    notepadRenameButton.disabled = readOnly || !note;
    notepadDeleteButton.disabled = readOnly || !note || notepadState.notes.length <= 1;
    notepadEditButton.disabled = readOnly || !note || notepadEditing;
    notepadEditButton.hidden = notepadEditing;
    notepadDoneButton.hidden = !notepadEditing;
    notepadArticleName.disabled = readOnly || !note || !notepadEditing;
    notepadAddLinkButton.disabled = readOnly || !note || !notepadEditing;
    notepadArticleName.value = "";
    notepadView.hidden = notepadEditing;
    notepadEditor.hidden = !notepadEditing;
    hideNotepadLinkSuggestions();

    if(note)
        renderNotepadView(note.content);
    else
        notepadView.replaceChildren();

    if(typeof world !== "undefined") {
        world
            .filter(article => canReadArticle(article))
            .forEach(article => {
                const option = document.createElement("option");
                option.value = article.name;
                notepadArticleList.append(option);
            });
    }

    if(notepadStorageError)
        setNotepadStatus("Notepad storage could not be accessed.", true);
    else if(notepadDataInvalid)
        setNotepadStatus("Saved note data is invalid; editing will replace it.", true);
    else if(notepadPreferenceError)
        setNotepadStatus("Notepad size preference could not be saved.", true);
    else if(readOnly && isGM)
        setNotepadStatus("Viewing local browser data; this is not shared across devices.");
    else
        setNotepadStatus("Saved in this browser");
}

function toggleNotepad(forceOpen) {
    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : notepadPanel.hidden;
    notepadPanel.hidden = !shouldOpen;
    notepadToggle.setAttribute("aria-expanded", String(shouldOpen));
    if(shouldOpen) {
        renderNotepad();
    } else if(notepadEditing) {
        notepadEditing = false;
        renderNotepad();
    }
}

function setNotepadExpanded(expanded, persist = true) {
    notepadPanel.classList.toggle("expanded", expanded);
    notepadExpand.setAttribute("aria-pressed", String(expanded));
    notepadExpand.setAttribute("aria-label", expanded ? "Restore notepad" : "Expand notepad");
    notepadExpand.title = expanded ? "Restore notepad" : "Expand notepad";
    notepadExpand.textContent = expanded ? "⤡" : "⛶";

    if(!persist)
        return;

    try {
        localStorage.setItem(NOTEPAD_EXPANDED_STORAGE_KEY, String(expanded));
        notepadPreferenceError = false;
    } catch(error) {
        console.error("Could not save notepad size preference:", error);
        notepadPreferenceError = true;
        if(!notepadPanel.hidden)
            setNotepadStatus("Notepad size preference could not be saved.", true);
    }
}

notepadToggle.addEventListener("click", () => toggleNotepad());
notepadClose.addEventListener("click", () => toggleNotepad(false));
notepadExpand.addEventListener("click", () => {
    setNotepadExpanded(!notepadPanel.classList.contains("expanded"));
});

try {
    setNotepadExpanded(localStorage.getItem(NOTEPAD_EXPANDED_STORAGE_KEY) === "true", false);
} catch(error) {
    console.error("Could not load notepad size preference:", error);
    notepadPreferenceError = true;
    setNotepadExpanded(false, false);
}

const gmNotebookOption = document.createElement("option");
gmNotebookOption.value = "GM";
gmNotebookOption.textContent = "GM";
notepadOwnerPicker.append(gmNotebookOption);

Object.keys(CONFIG.players).forEach(playerName => {
    const option = document.createElement("option");
    option.value = playerName;
    option.textContent = playerName;
    notepadOwnerPicker.append(option);
});

notepadOwnerPicker.addEventListener("change", renderNotepad);

notepadAddButton.addEventListener("click", () => {
    if(!notepadState || isNotepadReadOnly())
        return;

    const noteNumber = notepadState.notes.length + 1;
    const note = {id: createNotepadId(), title: `Note ${noteNumber}`, content: ""};
    notepadState.notes.push(note);
    notepadState.activeNoteId = note.id;
    notepadEditing = true;
    saveNotepad();
    renderNotepad();
    notepadContent.focus();
});

notepadEditButton.addEventListener("click", () => {
    if(isNotepadReadOnly() || !getActiveNotepadNote())
        return;

    notepadEditing = true;
    renderNotepad();
    notepadContent.focus();
});

notepadDoneButton.addEventListener("click", () => {
    notepadEditing = false;
    renderNotepad();
});

notepadRenameButton.addEventListener("click", () => {
    const note = getActiveNotepadNote();
    if(!note || isNotepadReadOnly())
        return;

    const title = window.prompt("Note name:", note.title);
    if(title === null)
        return;

    const trimmedTitle = title.trim();
    if(!trimmedTitle) {
        window.alert("Note name cannot be empty.");
        return;
    }

    note.title = trimmedTitle;
    saveNotepad();
    renderNotepad();
});

notepadDeleteButton.addEventListener("click", () => {
    if(!notepadState || isNotepadReadOnly() || notepadState.notes.length <= 1)
        return;

    const note = getActiveNotepadNote();
    if(!note || !window.confirm(`Delete "${note.title}"?`))
        return;

    notepadState.notes = notepadState.notes.filter(item => item.id !== note.id);
    notepadState.activeNoteId = notepadState.notes[0].id;
    saveNotepad();
    renderNotepad();
});

notepadContent.addEventListener("input", () => {
    const note = getActiveNotepadNote();
    if(!note || isNotepadReadOnly())
        return;

    note.content = notepadContent.value;
    saveNotepad();
    renderNotepadLinkSuggestions();
});

notepadContent.addEventListener("click", renderNotepadLinkSuggestions);
notepadContent.addEventListener("keyup", event => {
    if(!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key))
        renderNotepadLinkSuggestions();
});
notepadContent.addEventListener("keydown", handleNotepadSuggestionKeys);
notepadContent.addEventListener("blur", event => {
    if(!notepadLinkSuggestions.contains(event.relatedTarget))
        hideNotepadLinkSuggestions();
});

notepadAddLinkButton.addEventListener("click", () => {
    const articleName = notepadArticleName.value.trim();
    const article = articleName ? getArticle(articleName) : null;
    if(!article || !canReadArticle(article)) {
        window.alert("Choose an article that you can access.");
        return;
    }

    const link = `[[${article.name}]]`;
    const start = notepadContent.selectionStart;
    const end = notepadContent.selectionEnd;
    notepadContent.setRangeText(link, start, end, "end");
    notepadContent.dispatchEvent(new Event("input", {bubbles: true}));
    notepadArticleName.value = "";
    notepadContent.focus();
});

notepadView.addEventListener("click", event => {
    const link = event.target.closest("[data-notepad-article]");
    if(!link)
        return;

    event.preventDefault();
    const article = getArticle(link.dataset.notepadArticle);
    if(article)
        openArticle(article);
});

window.addEventListener("storage", event => {
    if(notepadPanel.hidden || !notepadViewedOwner || event.key !== getNotepadStorageKey(notepadViewedOwner))
        return;

    loadNotepad(notepadViewedOwner);
    renderNotepad();
});
