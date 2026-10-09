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
const notepadBackupsToggle = document.getElementById("notepad-backups-toggle");
const notepadBackupsPanel = document.getElementById("notepad-backups");
const notepadBackupSelect = document.getElementById("notepad-backup-select");
const notepadBackupRestore = document.getElementById("notepad-backup-restore");
const notepadBackupStatus = document.getElementById("notepad-backup-status");
const notepadRetryButton = document.getElementById("notepad-retry");
const notepadAddLinkButton = document.getElementById("notepad-add-link");
const NOTEPAD_STORAGE_PREFIX = "darien-map-notepad:";
const NOTEPAD_EXPANDED_STORAGE_KEY = "darien-map-notepad-expanded";
const NOTEPAD_BACKUP_LIMIT = 20;
const NOTEPAD_TABLE = "darien_notepads";
const NOTEPAD_SAVE_DELAY = 500;
const notepadSupabase = typeof pingRealtime !== "undefined" ? pingRealtime : null;

let notepadViewedOwner = null;
let notepadState = null;
let notepadStorageError = false;
let notepadDataInvalid = false;
let notepadLoading = false;
let notepadLoadError = false;
let notepadEditing = false;
let notepadSuggestionIndex = -1;
let notepadPreferenceError = false;
let notepadBackups = [];
let notepadSaveQueue = Promise.resolve();
let notepadSaveTimer = null;
let notepadSavedGlobally = false;
const notepadRecentStateKeys = new Map();

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

function updateNotepadOwnerOptions() {
    const availableOwners = isGM
        ? [
            {value: "GM", label: "GM"},
            {value: "Party", label: "Party"},
            ...Object.keys(CONFIG.players).map(playerName => ({value: playerName, label: playerName}))
        ]
        : [
            ...(currentPlayer ? [{value: currentPlayer, label: currentPlayer}] : []),
            {value: "Party", label: "Party"}
        ];
    const allowedOwners = new Set(availableOwners.map(owner => owner.value));
    const preferredOwner = allowedOwners.has(notepadViewedOwner)
        ? notepadViewedOwner
        : isGM
            ? "GM"
            : currentPlayer || "Party";

    notepadOwnerPicker.replaceChildren();
    availableOwners.forEach(owner => {
        const option = document.createElement("option");
        option.value = owner.value;
        option.textContent = owner.label;
        notepadOwnerPicker.append(option);
    });
    notepadOwnerPicker.value = preferredOwner;
    return preferredOwner;
}

function isNotepadReadOnly() {
    if(isGM)
        return notepadViewedOwner !== "GM" && notepadViewedOwner !== "Party";

    return notepadViewedOwner !== "Party" && notepadViewedOwner !== currentPlayer;
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

function normalizeNotepadBackups(backups) {
    if(!Array.isArray(backups))
        return [];

    return backups
        .filter(backup =>
            backup &&
            Number.isFinite(Number(backup.createdAt)) &&
            normalizeNotepadState(backup.state)
        )
        .sort((first, second) => Number(second.createdAt) - Number(first.createdAt))
        .slice(0, NOTEPAD_BACKUP_LIMIT);
}

function rememberNotepadState(owner, state) {
    const normalized = normalizeNotepadState(state);
    if(!normalized)
        return;

    const stateKey = JSON.stringify(normalized);
    const recentStateKeys = notepadRecentStateKeys.get(owner) || [];
    notepadRecentStateKeys.set(owner, [
        stateKey,
        ...recentStateKeys.filter(key => key !== stateKey)
    ].slice(0, 8));
}

function readLegacyNotepad(owner) {
    try {
        const saved = localStorage.getItem(getNotepadStorageKey(owner));
        if(!saved)
            return null;

        const state = normalizeNotepadState(JSON.parse(saved));
        if(!state) {
            console.warn("Saved local notepad is invalid and will not be migrated.");
            notepadDataInvalid = true;
        }
        return state;
    } catch(error) {
        console.warn("Could not read local notepad for migration:", error);
        notepadDataInvalid = true;
        return null;
    }
}

async function fetchRemoteNotepad(owner) {
    const {data, error} = await notepadSupabase
        .from(NOTEPAD_TABLE)
        .select("owner,state,backups,updated_at")
        .eq("owner", owner)
        .maybeSingle();
    if(error)
        throw error;
    return data;
}

function applyRemoteNotepad(row) {
    const state = normalizeNotepadState(row.state);
    if(!state)
        throw new Error(`The shared ${row.owner} notebook has invalid data.`);

    notepadState = state;
    notepadBackups = normalizeNotepadBackups(row.backups);
    rememberNotepadState(row.owner, state);
    notepadStorageError = false;
    notepadLoadError = false;
    notepadSavedGlobally = true;
}

async function loadNotepad(owner) {
    notepadLoading = true;
    notepadLoadError = false;
    notepadStorageError = false;
    notepadSavedGlobally = false;
    notepadState = null;
    notepadBackups = [];
    setNotepadStatus("Loading shared notebook...");
    notepadRetryButton.hidden = true;
    renderNotepadControls();

    try {
        if(!notepadSupabase)
            throw new Error("Supabase is not configured for shared notebook storage.");

        let row = await fetchRemoteNotepad(owner);
        if(owner !== notepadViewedOwner)
            return;

        if(!row) {
            const initialState = readLegacyNotepad(owner) || createNotepadState();
            const {data, error} = await notepadSupabase
                .from(NOTEPAD_TABLE)
                .insert({owner, state: initialState})
                .select("owner,state,backups,updated_at")
                .single();

            if(error && error.code !== "23505")
                throw error;
            row = data || await fetchRemoteNotepad(owner);
            if(!row)
                throw error || new Error("The shared notebook could not be created or loaded.");
        }

        if(owner !== notepadViewedOwner)
            return;
        applyRemoteNotepad(row);
        notepadEditing = false;
    } catch(error) {
        console.error(`Could not load shared ${owner} notebook:`, error);
        if(owner === notepadViewedOwner) {
            notepadState = null;
            notepadBackups = [];
            notepadStorageError = true;
            notepadLoadError = true;
            setNotepadStatus("Could not load shared storage. Check the Supabase setup and retry.", true);
        }
    } finally {
        if(owner === notepadViewedOwner) {
            notepadLoading = false;
            renderNotepad();
        }
    }
}

function renderNotepadControls() {
    const unavailable = notepadLoading || !notepadState;
    const readOnly = isNotepadReadOnly() || unavailable;
    const note = getActiveNotepadNote();

    notepadAddButton.disabled = readOnly;
    notepadRenameButton.disabled = readOnly || !note;
    notepadDeleteButton.disabled = readOnly || !note || notepadState?.notes.length <= 1;
    notepadEditButton.disabled = readOnly || !note || notepadEditing;
    notepadContent.disabled = readOnly || !note || !notepadEditing;
    notepadArticleName.disabled = readOnly || !note || !notepadEditing;
    notepadAddLinkButton.disabled = readOnly || !note || !notepadEditing;
    notepadBackupRestore.disabled = readOnly || notepadBackups.length === 0;
    notepadRetryButton.hidden = !notepadLoadError && !notepadStorageError;
    notepadRetryButton.textContent = notepadLoadError ? "Retry connection" : "Retry save";
}

function renderNotepadBackups() {
    notepadBackupSelect.replaceChildren();
    notepadBackupStatus.textContent = "";
    notepadBackupRestore.disabled = true;

    if(!notepadViewedOwner)
        return;

    notepadBackups.forEach((backup, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = new Date(Number(backup.createdAt)).toLocaleString();
        notepadBackupSelect.append(option);
    });
    notepadBackupRestore.disabled = isNotepadReadOnly() || notepadLoading || notepadBackups.length === 0;
    notepadBackupStatus.textContent = notepadBackups.length
        ? `${notepadBackups.length} saved version${notepadBackups.length === 1 ? "" : "s"}`
        : "No backups yet. Older versions are saved automatically as you edit.";
}

function saveNotepad(options = {}) {
    if(!notepadState || isNotepadReadOnly() || !notepadViewedOwner || notepadLoading)
        return Promise.resolve(false);

    if(notepadSaveTimer) {
        window.clearTimeout(notepadSaveTimer);
        notepadSaveTimer = null;
    }

    const owner = notepadViewedOwner;
    const stateSnapshot = JSON.parse(JSON.stringify(notepadState));
    setNotepadStatus("Saving to shared storage...");
    const saveTask = async () => {
        if(!notepadSupabase)
            throw new Error("Supabase is not configured for shared notebook storage.");

        const row = {owner, state: stateSnapshot};
        rememberNotepadState(owner, stateSnapshot);
        if(options.backupState) {
            row.backups = normalizeNotepadBackups([
                {createdAt: Date.now(), state: options.backupState},
                ...notepadBackups
            ]);
        }
        const {data, error} = await notepadSupabase
            .from(NOTEPAD_TABLE)
            .upsert(row, {onConflict: "owner"})
            .select("owner,state,backups,updated_at")
            .single();
        if(error)
            throw error;

        if(owner === notepadViewedOwner) {
            notepadBackups = normalizeNotepadBackups(data.backups);
            notepadSavedGlobally = true;
            notepadStorageError = false;
            notepadDataInvalid = false;
            setNotepadStatus("Saved globally · publicly readable and editable");
            renderNotepadControls();
            if(!notepadBackupsPanel.hidden)
                renderNotepadBackups();
        }
        return true;
    };

    notepadSaveQueue = notepadSaveQueue
        .catch(() => false)
        .then(saveTask)
        .catch(error => {
            console.error(`Could not save shared ${owner} notebook:`, error);
            if(owner === notepadViewedOwner) {
                notepadStorageError = true;
                setNotepadStatus("Could not save to shared storage. Your edit is still in this page; retry.", true);
                renderNotepadControls();
            }
            return false;
        });
    return notepadSaveQueue;
}

function scheduleNotepadSave() {
    if(notepadSaveTimer)
        window.clearTimeout(notepadSaveTimer);

    setNotepadStatus("Unsaved changes...");
    notepadSaveTimer = window.setTimeout(() => {
        notepadSaveTimer = null;
        saveNotepad();
    }, NOTEPAD_SAVE_DELAY);
}

function getNotepadBackups() {
    return notepadBackups;
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
    notepadOwnerPickerWrap.hidden = false;
    const selectedOwner = updateNotepadOwnerOptions();
    if(notepadViewedOwner !== selectedOwner) {
        notepadViewedOwner = selectedOwner;
        notepadEditing = false;
        loadNotepad(notepadViewedOwner);
        notepadOwnerLabel.textContent = `${selectedOwner} notebook · cloud-synced · publicly readable/editable`;
        return;
    }

    notepadOwnerLabel.textContent = notepadViewedOwner === "Party"
        ? "Shared Party notebook · cloud-synced · publicly readable/editable"
        : notepadViewedOwner === "GM"
            ? "GM notebook · cloud-synced · publicly readable/editable"
            : isGM
                ? `${notepadViewedOwner}'s notebook · cloud-synced · publicly readable/editable (view-only here)`
                : `${notepadViewedOwner} notebook · cloud-synced · publicly readable/editable`;

    const hasNotebook = Boolean(notepadState);
    const readOnly = isNotepadReadOnly() || !hasNotebook || notepadLoading;
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
    renderNotepadControls();

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

    if(notepadLoading)
        setNotepadStatus("Loading shared notebook...");
    else if(notepadLoadError)
        setNotepadStatus("Could not load shared storage. Check the Supabase setup and retry.", true);
    else if(notepadStorageError)
        setNotepadStatus("Could not save to shared storage. Your edit remains in this page; retry.", true);
    else if(notepadDataInvalid)
        setNotepadStatus("The previous local version was invalid; a new cloud notebook was started.", true);
    else if(notepadPreferenceError)
        setNotepadStatus("Notepad size preference could not be saved.", true);
    else if(readOnly)
        setNotepadStatus("Read-only here; anyone can still edit notebooks through the public API.");
    else if(notepadSavedGlobally)
        setNotepadStatus("Saved globally · publicly readable and editable");
    else
        setNotepadStatus("Ready to save globally · publicly readable and editable");

    if(!notepadBackupsPanel.hidden)
        renderNotepadBackups();
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

notepadOwnerPicker.addEventListener("change", () => {
    if(notepadSaveTimer) {
        window.clearTimeout(notepadSaveTimer);
        notepadSaveTimer = null;
        saveNotepad();
    }
    notepadViewedOwner = notepadOwnerPicker.value;
    notepadEditing = false;
    renderNotepad();
});

notepadRetryButton.addEventListener("click", () => {
    if(!notepadViewedOwner)
        return;

    if(notepadLoadError)
        loadNotepad(notepadViewedOwner);
    else
        saveNotepad();
});

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

notepadBackupsToggle.addEventListener("click", () => {
    notepadBackupsPanel.hidden = !notepadBackupsPanel.hidden;
    const isOpen = !notepadBackupsPanel.hidden;
    notepadBackupsToggle.setAttribute("aria-expanded", String(isOpen));
    notepadBackupsToggle.setAttribute("aria-label", isOpen ? "Hide saved versions" : "Show saved versions");
    notepadBackupsToggle.title = isOpen ? "Hide saved versions" : "Saved versions";
    if(!notepadBackupsPanel.hidden)
        renderNotepadBackups();
});

notepadBackupRestore.addEventListener("click", async () => {
    if(!notepadState || isNotepadReadOnly() || !notepadViewedOwner)
        return;

    try {
        const backups = getNotepadBackups();
        const selectedBackup = backups[Number(notepadBackupSelect.value)];
        if(!selectedBackup) {
            notepadBackupStatus.textContent = "Choose a saved version to restore.";
            return;
        }

        const createdAt = new Date(selectedBackup.createdAt).toLocaleString();
        if(!window.confirm(`Restore the notebook from ${createdAt}? The current version will also be backed up.`))
            return;

        const previousState = notepadState;
        notepadState = normalizeNotepadState(selectedBackup.state);
        notepadEditing = false;
        const saved = await saveNotepad({backupState: previousState});
        if(!saved) {
            notepadState = previousState;
            renderNotepad();
            return;
        }
        notepadBackupsPanel.hidden = true;
        renderNotepad();
    } catch(error) {
        console.error("Could not restore notepad backup:", error);
        notepadBackupStatus.textContent = "Could not restore that saved version.";
    }
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
    scheduleNotepadSave();
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
    if(event.key !== NOTEPAD_EXPANDED_STORAGE_KEY)
        return;

    setNotepadExpanded(event.newValue === "true", false);
});

if(notepadSupabase) {
    notepadSupabase
        .channel(`${CONFIG.map.realtime.room || "darien-map"}-notepad-sync`)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: NOTEPAD_TABLE
        }, async event => {
            if(notepadPanel.hidden || !notepadViewedOwner)
                return;

            const changedOwner = event.new?.owner || event.old?.owner;
            if(changedOwner !== notepadViewedOwner)
                return;

            try {
                const owner = notepadViewedOwner;
                const row = await fetchRemoteNotepad(owner);
                if(owner !== notepadViewedOwner || !row)
                    return;

                const remoteStateKey = JSON.stringify(normalizeNotepadState(row.state));
                const recentStateKeys = notepadRecentStateKeys.get(owner) || [];
                if(recentStateKeys.includes(remoteStateKey))
                    return;

                if(notepadEditing || notepadSaveTimer) {
                    setNotepadStatus("Another device changed this notebook while you were editing. Your next save may replace those changes.", true);
                } else {
                    applyRemoteNotepad(row);
                    renderNotepad();
                }
            } catch(error) {
                console.error("Could not refresh shared notebook:", error);
                setNotepadStatus("Could not refresh shared changes.", true);
            }
        })
        .subscribe(status => {
            if(status !== "SUBSCRIBED")
                console.warn("Notepad realtime status:", status);
        });
}
