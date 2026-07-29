const articleCache = {};

const preview =
    document.getElementById("wiki-preview");

function renderArticle(article, markdown){

    let html;

    if(article.category === "npc"){

        html = renderNPCQuote(markdown);

    }else{

        html = marked.parse(markdown);

    }

    document.getElementById("article").innerHTML = html;

}

function showPreview(article,x,y){

    preview.style.left = x + 20 + "px";

    preview.style.top = y + 20 + "px";

    preview.innerHTML =
        `
        <h3>${article.name}</h3>
        `;

    preview.style.display = "block";

}

function hidePreview(){

    preview.style.display = "none";

}

async function hoverArticle(event,page){

    const article = getArticle(page);

    if(!canReadArticle(article))
        return;

    if(!article)
        return;

    const data =
        await getArticleData(article);

    showPreview(
        data,
        event.pageX,
        event.pageY
    );

}

async function getArticleData(article){

    if(articleCache[article.file])
        return articleCache[article.file];

    const response =
        await fetch("wiki/" + article.file);

    const markdown =
        await response.text();

    const parsed =
        extractFrontmatter(markdown);

    articleCache[article.file] = parsed.data;

    return parsed.data;

}

function showPreview(article, x, y){

   const type = getArticleType(article.category);

    if(!type?.preview){

        hidePreview();

        return;

    }

    preview.innerHTML = type.preview(article);

    preview.style.display = "block";

    const margin = 20;

    let left = x + margin;
    let top = y + margin;

    const rect = preview.getBoundingClientRect();

    // Höger kant
    if(left + rect.width > window.innerWidth){

        left = x - rect.width - margin;

    }

    // Nederkant
    if(top + rect.height > window.innerHeight){

        top = window.innerHeight - rect.height - margin;

    }

    // Vänster kant
    if(left < margin){

        left = margin;

    }

    // Överkant
    if(top < margin){

        top = margin;

    }

    preview.style.left = left + "px";
    preview.style.top = top + "px";

}