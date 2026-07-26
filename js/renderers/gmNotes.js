function renderGMNotes(markdown){

    if(isGM){

        return markdown.replace(

            /<!--GM([\s\S]*?)-->/g,

            (_, content) =>

`<div class="gm-notes">

${content}

</div>`

        );

    }

    return markdown.replace(
        /<!--GM[\s\S]*?-->/g,
        ""
    );

}