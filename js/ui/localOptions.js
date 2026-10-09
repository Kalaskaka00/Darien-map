const localOptionsButton = document.getElementById("wiki-local-options");
const localOptionsPanel = document.getElementById("wiki-local-options-panel");
const localYearForm = document.getElementById("wiki-local-year-form");
const localYearInput = document.getElementById("wiki-local-year");
const localYearResetButton = document.getElementById("wiki-local-year-reset");
const localYearStatus = document.getElementById("wiki-local-year-status");

function updateLocalOptionsButton(){

    const changed = localYearOverride !== null &&
        localYearOverride !== CONFIG.world.currentYear;

    localOptionsButton.classList.toggle("local-options-changed", changed);
    localOptionsButton.setAttribute(
        "aria-label",
        changed
            ? `Local options; viewing year ${localYearOverride}; right-click to reset`
            : "Local options; right-click to reset"
    );
    localOptionsButton.title = changed
        ? `Local options - viewing year ${localYearOverride}; right-click to reset`
        : "Local options; right-click to reset";

}

function setLocalOptionsOpen(open){

    localOptionsPanel.hidden = !open;
    localOptionsButton.setAttribute("aria-expanded", String(open));

    if(open){
        localYearInput.value = String(getCurrentYear());
        localYearInput.focus();
        localYearInput.select();
    }

}

function refreshArticleForLocalYear(){

    const article = getCurrentArticle();

    if(article?.file)
        loadArticle(article.file);

}

function resetLocalOptions(){

    localYearOverride = null;
    localYearInput.value = String(getCurrentYear());
    localYearStatus.textContent = "Showing the world's current year. This only changes your view.";
    updateLocalOptionsButton();
    refreshArticleForLocalYear();

}

localOptionsButton.addEventListener("click", () => {
    setLocalOptionsOpen(localOptionsPanel.hidden);
});

localYearForm.addEventListener("submit", event => {

    event.preventDefault();

    const value = localYearInput.value.trim();
    const year = Number(value);

    if(!value || !Number.isInteger(year)){
        localYearStatus.textContent = "Enter a whole-number year.";
        localYearInput.focus();
        return;
    }

    localYearOverride = year;
    localYearStatus.textContent = `Viewing year ${year}. This only changes your view.`;
    updateLocalOptionsButton();
    refreshArticleForLocalYear();

});

localYearResetButton.addEventListener("click", () => {

    resetLocalOptions();

});

localOptionsButton.addEventListener("contextmenu", event => {

    event.preventDefault();
    resetLocalOptions();

});

document.addEventListener("click", event => {

    if(!localOptionsPanel.hidden &&
        !localOptionsPanel.contains(event.target) &&
        !localOptionsButton.contains(event.target))
        setLocalOptionsOpen(false);

});

document.addEventListener("keydown", event => {

    if(event.key === "Escape" && !localOptionsPanel.hidden){
        setLocalOptionsOpen(false);
        localOptionsButton.focus();
    }

});

updateLocalOptionsButton();
