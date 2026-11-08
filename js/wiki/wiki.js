async function loadArticle(file){

    hideWikiWriteAid();
    hideWikiLinkSuggestions();
    updateWikiArticleEditButton(null);

    const response = await fetch("wiki/" + file);
    if(!response.ok)
        throw new Error(`Unable to load article "${file}": ${response.status}`);

    let articleMarkdown = await response.text();
    if(getCurrentArticle()?.file !== file)
        return;

    let parsed = extractFrontmatter(articleMarkdown);

    let article = parsed.data;

    console.log(article);

    const worldArticle = getArticleByFile(file);

    console.log("Frontmatter:", article);

    if(worldArticle){
        applyArticleFrontmatter(worldArticle, article);

    }

    let revisionState = null;
    if(worldArticle){
        revisionState = await loadWikiArticleRevision(file, worldArticle);
        if(getCurrentArticle()?.file !== file)
            return;

        if(revisionState.revision){
            articleMarkdown = mergeWikiArticleRevision(articleMarkdown, revisionState.revision.proposed_markdown);
            parsed = extractFrontmatter(articleMarkdown);
            article = parsed.data;
            applyArticleFrontmatter(worldArticle, article);
        }
    }

    let markdown = parsed.content;

    const folder = getArticleFolder(file);

    if(getCurrentArticle()?.file !== file)
        return;

    markdown = renderMarkdown(
    markdown,
    folder
    );

    renderSidebar(worldArticle || article);

    await renderArticle(worldArticle || article, markdown);
    if(worldArticle){
        renderWikiArticleEditControls(worldArticle, articleMarkdown, revisionState);
        updateWikiArticleEditButton(worldArticle, revisionState);
    }

}

document.addEventListener("click", function(e){

    const wikilink = e.target.closest(".wikilink");

    if(!wikilink)
        return;

    e.preventDefault();

    const page = wikilink.dataset.page;
    const article = wikiIndex[page];

    if (wikiIndex[page]){
        openArticle(article);
    
    } else {

        console.warn("Ingen artikel hittades:", page);

    }
});