function renderWikiLinks(text){

    if(!text)
        return "";

    return text.replace(
        /(?<!!)\[\[(.*?)\]\]/g,
        (match,content)=>{

            const parts=content.split("|");

            const page=parts[0].split("#")[0].trim();

            const label=(parts[1]||parts[0]).trim();

            const article=world.find(a=>a.name===page);

            if(article){

                return `<a href="#" class="wikilink" data-page="${page}">${label}</a>`;

            }

            return label;

        }
    );

}
