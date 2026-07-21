function renderGMNotes(markdown){
    if(isGM)
        return markdown;

    return markdown.replace(
        /<!--GM[\s\S]*?-->/g,
        ""
    );

}