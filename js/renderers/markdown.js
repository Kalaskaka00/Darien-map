function renderMarkdown(markdown, folder){

    markdown = renderImages(markdown, folder);

    markdown = renderWikiLinks(markdown);

    markdown = renderYears(markdown);

    markdown = renderGMNotes(markdown);

    return markdown;

}