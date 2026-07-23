CONFIG.world.currentYear

const articleSidebar =
    document.getElementById("article-sidebar");

function renderSidebar(article){

    const type = getArticleType(article.category);

    if(!type?.sidebar){

        articleSidebar.innerHTML = "";

        return;

    }

    articleSidebar.innerHTML = type.sidebar(article);

}

function calculateAge(article){

    if(!article.birth)
        return "";

    const birth = parseInt(article.birth);

    if(article.death){

        return `${article.death - birth} (Deceased)`;

    }

    return CONFIG.world.currentYear - birth;

}

function getArticleFolder(file){

    return file.substring(0,file.lastIndexOf("/"));

}