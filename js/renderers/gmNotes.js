function renderGMNotes(markdown){
    if(isGM){

    markdown = markdown.replace(
        /<!--GM([\s\S]*?)-->/g,
        (_,content)=>
        `<div class="gm-notes">
        ${marked.parse(content)}
        </div>`
        );

    }else{

    markdown = markdown.replace(
        /<!--GM[\s\S]*?-->/g,
        ""
    );

}

    return markdown;

}