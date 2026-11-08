let currentArticle = null;
const articleFrontmatterBase = new WeakMap();
const articleFrontmatterKeys = new WeakMap();
const articleFrontmatterSourceKeys = new WeakMap();

function applyArticleFrontmatter(article, frontmatter){
    if(!articleFrontmatterBase.has(article)){
        articleFrontmatterBase.set(article, {...article});
        articleFrontmatterSourceKeys.set(article, new Set(Object.keys(frontmatter)));
    }

    const base = articleFrontmatterBase.get(article);
    const sourceKeys = articleFrontmatterSourceKeys.get(article);
    const previousKeys = articleFrontmatterKeys.get(article) || [];
    previousKeys.forEach(key => {
        if(!sourceKeys.has(key) && Object.prototype.hasOwnProperty.call(base, key))
            article[key] = base[key];
        else
            delete article[key];
    });

    const nextKeys = Object.keys(frontmatter);
    nextKeys.forEach(key => {
        article[key] = frontmatter[key];
    });
    articleFrontmatterKeys.set(article, nextKeys);
}

// Normalize apostrophe characters for consistent matching
function normalizeArticleName(name){
    return name
        .toLowerCase()
        .replace(/[''`]/g, "'"); // Convert all apostrophe variants to regular apostrophe
}

function getArticle(name){

    const normalized = normalizeArticleName(name);

    return world.find(
        article => normalizeArticleName(article.name) === normalized
    );

}

function getArticleByFile(file){

    return world.find(
        article => article.file === file
    );

}

function getHomeArticle(){

    return getArticleByFile("Home/Home.md") ||
        getArticle("Home");

}

function canReadArticle(article){

    if(isGM)
        return true;

    return article.visibility !== "gm";

}

function setCurrentArticle(article){

    currentArticle = article;

}

function getCurrentArticle(){

    return currentArticle;

}