CONFIG.world.currentYear

const articleSidebar =
    document.getElementById("article-sidebar");

function renderSidebar(article){

    const sidebar = document.getElementById("article-sidebar");

    const renderer = getArticleRenderer(article.category);

    if(!renderer){

        articleSidebar.innerHTML = "";

        return;

    }

    articleSidebar.innerHTML = renderer.sidebar(article);

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