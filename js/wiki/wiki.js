async function loadArticle(file){

    const response = await fetch("wiki/" + file);

    let markdown = await response.text();

    const parsed = extractFrontmatter(markdown);

    const article = parsed.data;

    markdown = parsed.content;

    const folder = getArticleFolder(file);

    markdown = renderMarkdown(
    markdown,
    folder
    );

    renderSidebar(article);

    renderArticle(markdown);

}



document.addEventListener("click", function(e){

    if(!e.target.classList.contains("wikilink"))
        return;

    e.preventDefault();

    const page = e.target.dataset.page;
    const article = wikiIndex[page];

    if (wikiIndex[page]){
        openArticle(article);
    
    } else {

        console.warn("Ingen artikel hittades:", page);

    }
});