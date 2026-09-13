function historyYear(value){

    const year = Number(value);

    return Number.isFinite(year) ? year : null;

}

function historyEndYear(article){

    return historyYear(article.EndYear ?? article.endYear ?? article.StartYear);

}

function historyStartYear(article){

    return historyYear(article.StartYear ?? article.startYear);

}

function formatHistoryYears(article){

    const start = historyStartYear(article);
    const end = historyEndYear(article);

    if(start === null)
        return "Unknown date";

    return end === null || end === start
        ? `Year ${start}`
        : `Year ${start} - ${end}`;

}

function formatHistoryContext(article){

    const start = historyStartYear(article);
    const end = historyEndYear(article);

    if(start === null)
        return "Unknown date";

    const currentYear = Number(CONFIG.world.currentYear);
    const yearLabel = formatHistoryYears(article);

    if(!Number.isFinite(currentYear))
        return yearLabel;

    if(currentYear >= start && currentYear <= (end ?? start))
        return `${yearLabel} (ongoing), the current year: ${currentYear}`;

    if(currentYear < start)
        return `${yearLabel} (in ${start - currentYear} years), the current year: ${currentYear}`;

    const startAgo = currentYear - start;
    const endAgo = currentYear - (end ?? start);

    if(start === (end ?? start))
        return `${yearLabel} (${startAgo} years ago), the current year: ${currentYear}`;

    return `${yearLabel} (${startAgo} years ago until ${endAgo} years ago), the current year: ${currentYear}`;

}

function formatHistoryElapsed(article){

    const start = historyStartYear(article);
    const end = historyEndYear(article);
    const currentYear = Number(CONFIG.world.currentYear);

    if(start === null || !Number.isFinite(currentYear))
        return "Unknown date";

    if(currentYear >= start && currentYear <= (end ?? start))
        return "ongoing";

    if(currentYear < start)
        return `in ${start - currentYear} years`;

    const startAgo = currentYear - start;
    const endAgo = currentYear - (end ?? start);

    if(start === (end ?? start))
        return `${startAgo} years ago`;

    return `${startAgo} years ago until ${endAgo} years ago`;

}

function getHistoryEvents(article){

    return world
        .filter(candidate =>
            candidate.category === "history" &&
            candidate.file !== article.file &&
            historyStartYear(candidate) !== null &&
            canReadArticle(candidate)
        )
        .sort((left, right) =>
            historyStartYear(left) - historyStartYear(right) ||
            left.name.localeCompare(right.name)
        );

}

function buildHistoryTimeline(article){

    const currentStart = historyStartYear(article);
    const currentEnd = historyEndYear(article) ?? currentStart;

    if(currentStart === null)
        return "";

    const events = getHistoryEvents(article);
    const previous = events
        .filter(event => historyEndYear(event) <= currentStart)
        .slice(-2);
    const later = events
        .filter(event => historyStartYear(event) >= currentEnd)
        .slice(0, 2);
    const timeline = [...previous, article, ...later];

    return `
        <div class="history-timeline">
            ${timeline.map(event => `
                <a
                    class="wikilink history-event${event.file === article.file ? " history-event-current" : ""}"
                    href="#"
                    data-page="${escapeArticleHTML(event.name)}">
                    <span class="history-event-year">${formatHistoryYears(event)}</span>
                    <span class="history-event-name">${escapeArticleHTML(event.name)}</span>
                </a>
            `).join("")}
        </div>
    `;

}

function buildHistorySidebar(article){

    const color = article.color || "#4b5963";

    return `
        <section class="history-card" style="--history-color:${color};">
            <header class="history-banner">
                <span>${escapeArticleHTML(article.name)}</span>
                <strong>${formatHistoryContext(article)}</strong>
            </header>
            ${buildHistoryTimeline(article)}
        </section>
    `;

}

function buildHistoryPreview(article){

    const color = article.color || "#4b5963";

    return `
        <section class="history-card" style="--history-color:${color};">
            <header class="history-banner">
                <strong class="history-preview-time">${formatHistoryElapsed(article)}</strong>
            </header>
            ${buildHistoryTimeline(article)}
        </section>
    `;

}

registerArticleType("history",{

    sidebar: buildHistorySidebar,

    preview: buildHistoryPreview,

    focus: focusArticle,

    onOpen(article){},

    onClose(article){},

    icon:"⌛"

});