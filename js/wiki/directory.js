const directoryButton = document.getElementById("wiki-directory");
const directoryLayout = document.getElementById("article-layout");
const directorySidebar = document.getElementById("article-sidebar");
const directoryContent = document.getElementById("article");

let directoryOpen = false;

function escapeDirectoryText(value){

    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

function createDirectoryTree(){

    const root = { folders: new Map(), articles: [] };

    world
        .filter(canReadArticle)
        .forEach(article => {

            const parts = article.file.split("/");
            const fileName = parts.pop().replace(/\.md$/i, "");
            let folder = root;

            parts.forEach(part => {

                if(!folder.folders.has(part))
                    folder.folders.set(part, { folders: new Map(), articles: [] });

                folder = folder.folders.get(part);

            });

            folder.articles.push({ ...article, fileName });

        });

    return root;

}

function renderDirectoryFolder(folder){

    const entries = [];

    [...folder.folders.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .forEach(([name, child]) => {

            const contents = renderDirectoryFolder(child);

            if(contents)
                entries.push(`<li class="directory-folder"><span class="directory-folder-toggle" data-directory-toggle role="button" tabindex="0" aria-expanded="false">${escapeDirectoryText(name)}</span><ul class="directory-folder-contents">${contents}</ul></li>`);

        });

    folder.articles
        .sort((left, right) => left.name.localeCompare(right.name))
        .forEach(article => {

            entries.push(`
                <li class="directory-article">
                    <a href="#" data-directory-file="${escapeDirectoryText(article.file)}">${escapeDirectoryText(article.name || article.fileName)}</a>
                </li>
            `);

        });

    return entries.join("");

}

function renderDirectory(){

    const contents = renderDirectoryFolder(createDirectoryTree());

    directorySidebar.innerHTML = "";
    directoryContent.innerHTML = `
        <section class="directory-view">
            <h1>Article directory</h1>
            <ul class="directory-tree">${contents}</ul>
        </section>
    `;

    directoryLayout.classList.add("directory-open");

}

function showCurrentArticle(){

    directoryLayout.classList.remove("directory-open");

    const article = getCurrentArticle() || getHomeArticle();

    if(article)
        openArticle(article, false);

}

function toggleDirectory(){

    directoryOpen = !directoryOpen;
    directoryButton.classList.toggle("active", directoryOpen);

    if(directoryOpen)
        renderDirectory();
    else
        showCurrentArticle();

}

function closeDirectory(){

    if(!directoryOpen)
        return;

    directoryOpen = false;
    directoryButton.classList.remove("active");
    directoryLayout.classList.remove("directory-open");

}

directoryButton.onclick = toggleDirectory;

directoryContent.addEventListener("click", event => {

    const folderToggle = event.target.closest("[data-directory-toggle]");

    if(folderToggle){

        const folder = folderToggle.parentElement;
        const expanded = folder.classList.toggle("directory-folder-open");

        folderToggle.setAttribute("aria-expanded", expanded);

        return;

    }

    const link = event.target.closest("[data-directory-file]");

    if(!link)
        return;

    event.preventDefault();

    const article = world.find(item => item.file === link.dataset.directoryFile);

    if(article){

        closeDirectory();
        openArticle(article);

    }

});

directoryContent.addEventListener("mouseover", event => {

    const link = event.target.closest("[data-directory-file]");

    if(!link || link.contains(event.relatedTarget))
        return;

    const article = world.find(item => item.file === link.dataset.directoryFile);

    if(article)
        hoverArticle(event, article.name);

});

directoryContent.addEventListener("mouseout", event => {

    const link = event.target.closest("[data-directory-file]");

    if(!link || link.contains(event.relatedTarget))
        return;

    hidePreview();

});

directoryContent.addEventListener("keydown", event => {

    if((event.key !== "Enter" && event.key !== " ") ||
        !event.target.matches("[data-directory-toggle]"))
        return;

    event.preventDefault();
    event.target.click();

});