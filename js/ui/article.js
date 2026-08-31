const articleCache = {};

const preview =
    document.getElementById("wiki-preview");

// Generate visibility info HTML
function getVisibilityInfoHTML(article) {
    // Show nothing if public or no visibility specified
    if(!article.visibility || article.visibility === "everyone") {
        return "";
    }

    // Only GM can see this info
    if(!isGM) {
        return "";
    }

    // Build visibility info for GM view
    let visibilityList = [];
    
    if(article.visibility === "gm") {
        visibilityList = ["GM Only"];
    } else {
        const visibleTo = Array.isArray(article.visibility) 
            ? article.visibility 
            : [article.visibility];
        visibilityList = ["GM", ...visibleTo];
    }

    const visibilityHTML = `
        <div class="visibility-info">
            <span class="visibility-label">Access:</span>
            <span class="visibility-list">${visibilityList.join(", ")}</span>
        </div>
    `;
    
    return visibilityHTML;
}

function renderArticle(article, markdown){

    let html;

    if(article.category === "npc"){

        html = renderNPCQuote(markdown);

    }else{

        html = marked.parse(markdown);

    }

    // Add visibility info at top (GM only)
    const visibilityInfo = getVisibilityInfoHTML(article);
    
    document.getElementById("article").innerHTML = visibilityInfo + html;

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

    if(!article)
        return;

    if(!canReadArticle(article))
        return;

    const data =
        await getArticleData(article);

    // Merge frontmatter data with article metadata
    const mergedArticle = { ...article, ...data };

    showPreview(
        mergedArticle,
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