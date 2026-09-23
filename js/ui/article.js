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

function renderArticle(article, markdown){

    let html;

    if(article.category === "npc" || article.category === "pc" || article.category === "family"){

        html = renderNPCQuote(markdown);

    }else if(article.category === "organisation"){

        html = renderOrganisationMotto(markdown);

    }else{

        html = marked.parse(markdown);

    }

    // Add visibility info at top (GM only)
    const visibilityInfo = getVisibilityInfoHTML(article);
    const wikiSummary = article.file === "Home/Home.md"
        ? renderWikiSummary()
        : "";
    
    document.getElementById("article").innerHTML =
        makeArticleHeadingsCollapsible(
            visibilityInfo + html + renderRelatedArticles(article) + wikiSummary
        );

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

    const markdown =
        await response.text();

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