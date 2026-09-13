async function loadArticle(file){

    const response = await fetch("wiki/" + file);

    let markdown = await response.text();

    const parsed = extractFrontmatter(markdown);

    const article = parsed.data;

    console.log(article);

    const worldArticle = getArticleByFile(file);

    console.log("Frontmatter:", article);

    if(worldArticle){

        Object.entries(article).forEach(([key, value]) => {

            if(value !== "")
                worldArticle[key] = value;

        });

    }

    markdown = parsed.content;

    const folder = getArticleFolder(file);

    if(getCurrentArticle()?.file !== file)
        return;

    markdown = renderMarkdown(
    markdown,
    folder
    );

    renderSidebar(worldArticle || article);

    renderArticle(worldArticle || article, markdown);

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