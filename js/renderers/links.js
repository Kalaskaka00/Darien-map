function renderWikiLinks(value){

    if(!value)
        return "";

    if(Array.isArray(value)){

        return value
            .map(renderWikiLinks)
            .join(", ");

    }

    return value.replace(

        /(?<!!)\[\[(.*?)\]\]/g,

        (match, content) => {

            const parts = content.split("|");

            const page = parts[0].split("#")[0].trim();

            const label = (parts[1] || parts[0]).trim();

            const article = getArticle(page);

            if(article && !canReadArticle(article)){

                return label;

            }

            if(article){

                return `<a href="#" class="wikilink" data-page="${page}">${label}</a>`;

            }

            // Ingen artikel → visa bara text
            return label;

        }

    );

}