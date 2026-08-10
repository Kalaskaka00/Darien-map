function renderMarkdown(markdown, folder){

    const renderers = [

        text => renderImages(text, folder),

        renderWikiLinks,

        renderYears,

        renderGMNotes

    ];

    return renderers.reduce(

        (text, renderer) => renderer(text),

        markdown

    );

}