function renderArticle(article, markdown){

    let html;

    if(article.category === "npc"){

        html = renderNPCQuote(markdown);

    }else{

        html = marked.parse(markdown);

    }

    document.getElementById("article").innerHTML = html;

}