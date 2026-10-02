const articleCache = {};

const preview =
    document.getElementById("wiki-preview");

// Generate visibility info HTML
function getVisibilityInfoHTML(article) {
    // Show nothing if public or no visibility specified
    if(!article.visibility || article.visibility === "everyone") {
        return "";
    }

    // Only GM can see this info
    if(!isGM) {
        return "";
    }

    // Build visibility info for GM view
    let visibilityList = [];
    
    if(article.visibility === "gm") {
        visibilityList = ["GM Only"];
    } else {
        const visibleTo = Array.isArray(article.visibility) 
            ? article.visibility 
            : [article.visibility];
        visibilityList = ["GM", ...visibleTo];
    }

    const visibilityHTML = `
        <div class="visibility-info">
            <span class="visibility-label">Access:</span>
            <span class="visibility-list">${visibilityList.join(", ")}</span>
        </div>
    `;
    
    return visibilityHTML;
}

async function renderArticle(article, markdown){

    let html;

    if(article.category === "npc" || article.category === "pc" || article.category === "family"){

        html = renderNPCQuote(markdown);

    }else if(article.category === "organisation"){

        html = renderOrganisationMotto(markdown);

    }else{

        html = marked.parse(markdown);

    }

    if(article.category === "summary")
        html = await renderSummaryLists(html);

    // Add visibility info at top (GM only)
    const visibilityInfo = getVisibilityInfoHTML(article);
    const wikiSummary = article.file === "Home/Home.md"
        ? renderWikiSummary()
        : "";
    
    document.getElementById("article").innerHTML =
        makeArticleHeadingsCollapsible(
            visibilityInfo + html + renderRelatedArticles(article) + wikiSummary
        );

    if(document.querySelector("#article .pc-summary-cards .npc-portrait-group"))
        startPortraitRotation();

}

async function renderSummaryLists(html){

    const container = document.createElement("div");
    container.innerHTML = html;

    const tablePlaceholders = [...container.querySelectorAll("p")]
        .filter(paragraph =>
            /^(?:\/(?:Mayor|Major|Minor) Deities Table\/|\/Organisations Table\/|\/Families Table\/|\/NPCs (?:Alive|Dead) Table\/|\/PC Headers\/)$/i.test(
                paragraph.textContent.trim()
            )
        );
    const hasDeityTable = tablePlaceholders.some(placeholder =>
        /^\/(?:Mayor|Major|Minor) Deities Table\/$/i.test(placeholder.textContent.trim())
    );
    const hasOrganisationTable = tablePlaceholders.some(placeholder =>
        /^\/Organisations Table\/$/i.test(placeholder.textContent.trim())
    );
    const hasFamilyTable = tablePlaceholders.some(placeholder =>
        /^\/Families Table\/$/i.test(placeholder.textContent.trim())
    );
    const hasNpcTables = tablePlaceholders.some(placeholder =>
        /^\/NPCs (?:Alive|Dead) Table\/$/i.test(placeholder.textContent.trim())
    );
    const hasPCHeaders = tablePlaceholders.some(placeholder =>
        /^\/PC Headers\/$/i.test(placeholder.textContent.trim())
    );
    const [deities, organisations, families, npcs, pcs] = await Promise.all([
        hasDeityTable
        ? await Promise.all(
            world
                .filter(article => article.category === "deity" && canReadArticle(article))
                .map(async article => ({
                    ...article,
                    ...await getArticleData(article)
                }))
        )
        : [],
        hasOrganisationTable
            ? await Promise.all(
                world
                    .filter(article => article.category === "organisation" && canReadArticle(article))
                    .map(async article => ({
                        ...article,
                        ...await getArticleData(article)
                    }))
            )
            : [],
        hasFamilyTable
            ? await Promise.all(
                world
                    .filter(article => article.category === "family" && canReadArticle(article))
                    .map(async article => ({
                        ...article,
                        ...await getArticleData(article)
                    }))
            )
            : [],
        hasNpcTables
            ? await Promise.all(
                world
                    .filter(article =>
                        article.category === "npc" && canReadArticle(article)
                    )
                    .map(async article => ({
                        ...article,
                        ...await getArticleData(article)
                    }))
            )
            : [],
        hasPCHeaders
            ? await Promise.all(
                world
                    .filter(article => article.category === "pc" && canReadArticle(article))
                    .map(async article => ({
                        ...article,
                        ...await getArticleData(article)
                    }))
            )
            : []
    ]);

    tablePlaceholders.forEach(placeholder => {

        const npcTableMatch = placeholder.textContent.trim().match(
            /^\/NPCs (Alive|Dead) Table\/$/i
        );

        if(npcTableMatch){
            const deceased = npcTableMatch[1].toLowerCase() === "dead";
            const selectedNPCs = npcs.filter(article =>
                (
                    article.death !== null &&
                    article.death !== undefined &&
                    String(article.death).trim() !== ""
                ) === deceased
            );
            placeholder.replaceWith(
                buildNpcSummaryTable(selectedNPCs, deceased)
            );
            return;
        }

        if(/^\/PC Headers\/$/i.test(placeholder.textContent.trim())){
            placeholder.replaceWith(buildPCSummaryHeaders(pcs));
            return;
        }

        if(/^\/Organisations Table\/$/i.test(placeholder.textContent.trim())){
            placeholder.replaceWith(buildOrganisationSummaryTable(organisations));
            return;
        }

        if(/^\/Families Table\/$/i.test(placeholder.textContent.trim())){
            placeholder.replaceWith(buildFamilySummaryTable(families));
            return;
        }

        const isMinor = /^\/Minor/i.test(placeholder.textContent.trim());
        const group = isMinor ? "Minor Deities" : "Major Deities";
        const groupDeities = deities
            .filter(article =>
                article.file.split("/").includes(group)
            )
            .sort((left, right) => left.name.localeCompare(right.name));
        const table = document.createElement("table");
        table.className = "deity-summary-table";

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Deity</th>
                    <th>Aspects</th>
                    <th>Races</th>
                    <th>Symbol</th>
                </tr>
            </thead>
            <tbody>
                ${groupDeities.map(article => {
                    const name = escapeArticleHTML(article.name);
                    const handlerName = article.name
                        .replace(/\\/g, "\\\\")
                        .replace(/'/g, "\\'");
                    const alternativeNames = formatSummaryValues(article.names);
                    const symbol = article.image
                        ? `<img class="deity-summary-symbol" src="wiki/Images/Symbols/${escapeArticleHTML(article.image)}" alt="${name} symbol" loading="lazy">`
                        : "";

                    return `
                        <tr style="--deity-color:${escapeArticleHTML(article.color || "#6b705c")}">
                            <th scope="row">
                                <a
                                    href="#"
                                    class="wikilink"
                                    data-page="${name}"
                                    onmouseenter="hoverArticle(event,'${handlerName}')"
                                    onmouseleave="hidePreview()">${name}</a>
                                ${alternativeNames
                                    ? `<span class="deity-summary-alternative-names">${escapeArticleHTML(alternativeNames)}</span>`
                                    : ""}
                            </th>
                            <td>${escapeArticleHTML(formatSummaryValues(article.aspects))}</td>
                            <td>${escapeArticleHTML(formatSummaryValues(article.races))}</td>
                            <td>${symbol}</td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        `;

        placeholder.replaceWith(table);

    });

    container.querySelectorAll("ul").forEach(list => {

        const items = [...list.children].filter(
            item => item.tagName === "LI"
        );

        if(!items.length)
            return;

        list.classList.add("summary-event-list");

        items.forEach(item => {

            const historyArticle = [...item.querySelectorAll("a[data-page]")]
                .map(link => getArticle(link.dataset.page))
                .find(candidate => candidate?.category === "history");

            item.classList.add("summary-event");
            item.style.setProperty(
                "--summary-color",
                historyArticle?.color || "#6b705c"
            );

            const yearLabel = [...item.children].find(child =>
                child.tagName === "STRONG" &&
                /^Year\b/i.test(child.textContent.trim())
            );

            if(!yearLabel)
                return;

            const year = document.createElement("span");
            year.className = "summary-event-year";
            year.append(yearLabel);

            const details = document.createElement("span");
            details.className = "summary-event-details";

            [...item.childNodes].forEach(node => {
                if(node !== yearLabel)
                    details.append(node);
            });

            item.replaceChildren(year, details);

        });

    });

    return container.innerHTML;

}

function buildOrganisationSummaryTable(organisations){

    const table = document.createElement("table");
    table.className = "organisation-summary-table";

    const rows = organisations
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(article => {
            const name = escapeArticleHTML(article.name);
            const handlerName = article.name
                .replace(/\\/g, "\\\\")
                .replace(/'/g, "\\'");
            const symbol = article.image
                ? `<img class="organisation-summary-symbol" src="wiki/Images/Symbols/${escapeArticleHTML(article.image)}" alt="" loading="lazy">`
                : "";

            return `
                <tr style="--organisation-color:${escapeArticleHTML(article.color || article.primaryColor || "#6b705c")}">
                    <th scope="row">
                        ${symbol}
                        <a
                            href="#"
                            class="wikilink"
                            data-page="${name}"
                            onmouseenter="hoverArticle(event,'${handlerName}')"
                            onmouseleave="hidePreview()">${name}</a>
                    </th>
                    <td>${escapeArticleHTML(formatSummaryValues(article.type))}</td>
                    <td>${renderWikiLinks(article.nations || [])}</td>
                </tr>
            `;
        })
        .join("");

    table.innerHTML = `
        <thead>
            <tr>
                <th>Organisation</th>
                <th>Type</th>
                <th>Nations</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    `;

    return table;

}

function buildFamilySummaryTable(families){

    const table = document.createElement("table");
    table.className = "family-summary-table";

    const rows = families
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(article => {
            const name = escapeArticleHTML(article.name);
            const handlerName = article.name
                .replace(/\\/g, "\\\\")
                .replace(/'/g, "\\'");
            const primaryColor = article.primaryColor || article.color || "#6f5328";
            const secondaryColor = article.secondaryColor || article.secondatyColor || primaryColor;
            const symbol = article.image
                ? `<img class="family-summary-symbol" src="wiki/Images/Coat of Arms/${escapeArticleHTML(article.image)}" alt="${name} coat of arms" loading="lazy">`
                : "";

            return `
                <tr style="--family-primary-color:${escapeArticleHTML(primaryColor)};--family-secondary-color:${escapeArticleHTML(secondaryColor)}">
                    <th scope="row">
                        <a
                            href="#"
                            class="wikilink"
                            data-page="${name}"
                            onmouseenter="hoverArticle(event,'${handlerName}')"
                            onmouseleave="hidePreview()">${name}</a>
                    </th>
                    <td>${symbol}</td>
                    <td>${renderWikiLinks(article.leader || "")}</td>
                    <td>${renderWikiLinks(article.nations || [])}</td>
                </tr>
            `;
        })
        .join("");

    table.innerHTML = `
        <thead>
            <tr>
                <th>Family</th>
                <th>Symbol</th>
                <th>Leader</th>
                <th>Nations</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    `;

    return table;

}

function buildNpcSummaryTable(npcs, deceased){

    const table = document.createElement("table");
    table.className = "npc-summary-table";

    const rows = npcs
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(article => {
            const articleName = escapeArticleHTML(article.name);
            const handlerName = article.name
                .replace(/\\/g, "\\\\")
                .replace(/'/g, "\\'");
            const displayName = `${deceased ? "† " : ""}${article.name}`;
            const yearValue = deceased
                ? formatSummaryValues(article.death)
                : formatSummaryNpcAge(article);

            return `
                <tr style="--npc-summary-color:${escapeArticleHTML(article.color || "#6b705c")}">
                    <th scope="row">
                        <a
                            href="#"
                            class="wikilink"
                            data-page="${articleName}"
                            onmouseenter="hoverArticle(event,'${handlerName}')"
                            onmouseleave="hidePreview()">${escapeArticleHTML(displayName)}</a>
                    </th>
                    <td>${escapeArticleHTML(yearValue)}</td>
                    <td>${renderSummaryLinks(article.origin)}</td>
                    <td>${renderSummaryLinks(article.family)}</td>
                    <td>${renderSummaryLinks(article.organisations)}</td>
                </tr>
            `;
        })
        .join("");

    table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>${deceased ? "Died" : "Age"}</th>
                <th>Origin</th>
                <th>Family</th>
                <th>Organisations</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    `;

    return table;

}

function buildPCSummaryHeaders(pcs){

    const cards = document.createElement("div");
    cards.className = "pc-summary-cards";

    cards.innerHTML = pcs
        .sort((left, right) =>
            (left.fullname || left.name).localeCompare(right.fullname || right.name)
        )
        .map(article => buildPCSidebar(article, true))
        .join("");

    return cards;

}

function formatSummaryNpcAge(article){

    const birthYear = Number.parseInt(article.birth, 10);
    const currentYear = Number(CONFIG.world.currentYear);

    if(!Number.isFinite(birthYear) || !Number.isFinite(currentYear))
        return "";

    return String(currentYear - birthYear);

}

function renderSummaryLinks(value){

    const values = (Array.isArray(value) ? value : [value])
        .filter(item => item !== null && item !== undefined && String(item).trim());

    return values.map(renderWikiLinks).join(", ");

}

function formatSummaryValues(value){

    return (Array.isArray(value) ? value : [value])
        .filter(item => item !== null && item !== undefined && item !== "")
        .join(", ");

}

function makeArticleHeadingsCollapsible(html){

    const container = document.createElement("div");
    container.innerHTML = html;

    const headings = [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")];
    const hasSingleLevelOneHeading =
        headings.filter(heading => heading.tagName === "H1").length === 1;

    headings.forEach(heading => {
        const level = heading.closest(".gm-notes") ? 2 : Number(heading.tagName.substring(1));

        heading.dataset.headingLevel = String(level);

        if(hasSingleLevelOneHeading && level === 1)
            return;

        heading.classList.add("article-collapsible-heading");
        heading.setAttribute("aria-expanded", "true");
        heading.setAttribute("role", "button");
        heading.setAttribute("tabindex", "0");

        if(heading.classList.contains("article-collapsed-by-default"))
            setArticleHeadingExpanded(heading, false);
    });

    return container.innerHTML;

}

function toggleArticleHeading(heading){

    const expanded = heading.getAttribute("aria-expanded") === "true";
    setArticleHeadingExpanded(heading, !expanded);

}

function setArticleHeadingExpanded(heading, expanded){

    const level = Number(heading.dataset.headingLevel);
    const content = [];
    let sibling = heading.nextElementSibling;

    while(sibling){

        const siblingLevel = sibling.matches("h1, h2, h3, h4, h5, h6")
            ? Number(sibling.dataset.headingLevel || sibling.tagName.substring(1))
            : null;

        if(siblingLevel !== null && siblingLevel <= level)
            break;

        content.push(sibling);
        sibling = sibling.nextElementSibling;

    }

    heading.setAttribute("aria-expanded", String(expanded));

    content.forEach(element => {
        element.hidden = !expanded;
    });

}

document.getElementById("article").addEventListener("click", event => {

    const heading = event.target.closest(".article-collapsible-heading");

    if(heading)
        toggleArticleHeading(heading);

});

document.getElementById("article").addEventListener("keydown", event => {

    if((event.key === "Enter" || event.key === " ") &&
        event.target.matches(".article-collapsible-heading")){

        event.preventDefault();
        toggleArticleHeading(event.target);

    }

});

function renderWikiSummary(){

    const latestBuild = wikiMeta.latestBuild
        ? new Date(wikiMeta.latestBuild).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        })
        : "Unknown";
    const articleCount = Number.isFinite(wikiMeta.articleCount)
        ? wikiMeta.articleCount
        : "Unknown";
    const latestChange = wikiMeta.latestChange || "No change note recorded.";
    const olderChangelogs = Array.isArray(wikiMeta.changelog)
        ? wikiMeta.changelog.filter(entry => entry.date !== wikiMeta.latestBuild)
        : [];
    const changelogHTML = olderChangelogs.length
        ? olderChangelogs.map(entry => `
            <dl class="wiki-changelog-entry">
                <div><dt>Update date</dt><dd>${escapeArticleHTML(formatChangelogDate(entry.date))}</dd></div>
                <div><dt>Articles</dt><dd>${escapeArticleHTML(String(entry.articleCount ?? "Unknown"))}</dd></div>
                <div><dt>Changes</dt><dd>${escapeArticleHTML(entry.changes || "No change note recorded.")}</dd></div>
            </dl>
        `).join("")
        : "<p>No older changelogs.</p>";

    return `
        <section class="wiki-summary">
            <h2>Wiki</h2>
            <dl>
                <div><dt>Latest update</dt><dd>${escapeArticleHTML(latestBuild)}</dd></div>
                <div><dt>Articles</dt><dd>${escapeArticleHTML(String(articleCount))}</dd></div>
                <div><dt>Latest changes</dt><dd>${escapeArticleHTML(latestChange)}</dd></div>
            </dl>
            <h3 class="article-collapsed-by-default">Older changelogs</h3>
            <div class="wiki-changelog">${changelogHTML}</div>
        </section>
    `;

}

function formatChangelogDate(value){

    return value
        ? new Date(value).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        })
        : "Unknown";

}

function escapeArticleHTML(value){

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

function renderRelatedArticles(article){

    if(article.related === false || article.Related === false)
        return "";

    const related = new Map();
    const references = [
        ...(article.references || []),
        ...(isGM ? article.gmReferences || [] : [])
    ];

    references.forEach(name => {
        const relatedArticle = getArticle(name);

        if(relatedArticle && relatedArticle.file !== article.file && canReadArticle(relatedArticle))
            related.set(relatedArticle.name, relatedArticle);
    });

    world.forEach(candidate => {
        const candidateReferences = [
            ...(candidate.references || []),
            ...(isGM ? candidate.gmReferences || [] : [])
        ];

        if(candidate.file !== article.file &&
            candidateReferences.includes(article.name) &&
            canReadArticle(candidate))
            related.set(candidate.name, candidate);
    });

    const links = [...related.values()]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(relatedArticle => {
            const name = escapeArticleHTML(relatedArticle.name);
            const page = escapeArticleHTML(relatedArticle.name);
            const handlerPage = relatedArticle.name
                .replace(/\\/g, "\\\\")
                .replace(/'/g, "\\'");

            return `<li><a href="#" class="wikilink" data-page="${page}" onmouseenter="hoverArticle(event,'${handlerPage}')" onmouseleave="hidePreview()">${name}</a></li>`;
        })
        .join("");

    return `<section class="related-articles"><h2>Related articles</h2><ul>${links}</ul></section>`;

}

function showPreview(article,x,y){

    preview.style.left = x + 20 + "px";

    preview.style.top = y + 20 + "px";

    preview.innerHTML =
        `
        <h3>${article.name}</h3>
        `;

    preview.style.display = "block";

}

function hidePreview(){

    preview.style.display = "none";

}

async function hoverArticle(event,page){

    const article = getArticle(page);

    if(!article)
        return;

    if(!canReadArticle(article))
        return;

    const data =
        await getArticleData(article);

    // Merge frontmatter data with article metadata
    const mergedArticle = { ...article, ...data };

    showPreview(
        mergedArticle,
        event.pageX,
        event.pageY
    );

}

async function getArticleData(article){

    if(articleCache[article.file])
        return articleCache[article.file];

    const response =
        await fetch("wiki/" + article.file);

    if(!response.ok)
        throw new Error(`Unable to load article data for "${article.name}": ${response.status}`);

    const markdown = await response.text();

    const parsed =
        extractFrontmatter(markdown);

    articleCache[article.file] = parsed.data;

    return parsed.data;

}

function showPreview(article, x, y){

   const type = getArticleType(article.category);

    if(!type?.preview){

        hidePreview();

        return;

    }

    preview.innerHTML = type.preview(article);

    startPortraitRotation();

    preview.style.display = "block";

    const margin = 20;

    let left = x + margin;
    let top = y + margin;

    const rect = preview.getBoundingClientRect();

    // Höger kant
    if(left + rect.width > window.innerWidth){

        left = x - rect.width - margin;

    }

    // Nederkant
    if(top + rect.height > window.innerHeight){

        top = window.innerHeight - rect.height - margin;

    }

    // Vänster kant
    if(left < margin){

        left = margin;

    }

    // Överkant
    if(top < margin){

        top = margin;

    }

    preview.style.left = left + "px";
    preview.style.top = top + "px";

}