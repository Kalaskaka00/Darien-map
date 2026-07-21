async function loadArticle(file){

    const response = await fetch("wiki/" + file);

    let markdown = await response.text();

      // Byt [[Länk]] mot klickbar HTML
    markdown = markdown.replace(
        /\[\[(.*?)\]\]/g,
        '<a href="#" class="wikilink" data-page="$1">$1</a>'
    );

    // Ta bort YAML Front Matter
    markdown = markdown.replace(
    /^---[\s\S]*?---\n?/,
    ""
);

    document.getElementById("article").innerHTML =
    marked.parse(markdown);

}

document.addEventListener("click", function(e){

    if(!e.target.classList.contains("wikilink"))
        return;

    e.preventDefault();

    const page = e.target.dataset.page;

    const article = wikiIndex[page];

    if (wikiIndex[page]){

        loadArticle(wikiIndex[page].file);

    map.flyTo(
        [article.map.y, article.map.x],
        2
    );

    const marker = markers[article.id];

    } else {

        console.warn("Ingen artikel hittades:", page);

    }

});