const articleTypes = {};

function registerArticleType(category, renderer){

    articleTypes[category] = renderer;

}

function getArticleRenderer(category){

    return articleTypes[category];

}