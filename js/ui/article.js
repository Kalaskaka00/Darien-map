function renderArticle(markdown){

    markdown=markdown.replace(/^# .*?\n/, "");

    document.getElementById("article").innerHTML=
        marked.parse(markdown);

}