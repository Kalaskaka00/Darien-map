const articleTypes = {};

function registerArticleType(category, type){

    articleTypes[category] = type;

}

function getArticleType(category){

    return articleTypes[category];

}