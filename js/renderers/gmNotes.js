function renderGMNotes(markdown){

    const codeBlocks = [];
    const placeholder = index => `\u0000GM_NOTE_CODE_${index}\u0000`;
    const maskCode = code => {
        const index = codeBlocks.push(code) - 1;
        return placeholder(index);
    };

    let protectedMarkdown = markdown.replace(
        /(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)/g,
        maskCode
    );
    protectedMarkdown = protectedMarkdown.replace(
        /(`+)(?:\\.|[^`])*?\1/g,
        maskCode
    );

    protectedMarkdown = isGM
        ? protectedMarkdown.replace(
            /<!--GM([\s\S]*?)-->/g,
            (_, content) => `<div class="gm-notes">\n${content}\n</div>`
        )
        : protectedMarkdown.replace(/<!--GM[\s\S]*?-->/g, "");

    return protectedMarkdown.replace(
        /\u0000GM_NOTE_CODE_(\d+)\u0000/g,
        (_, index) => codeBlocks[Number(index)]
    );

}