const search = document.getElementById("search");
const results = document.getElementById("search-results");

let currentMatches = [];

let selectedIndex = -1;

search.addEventListener("input", function(){

    const text = this.value.toLowerCase();

    results.innerHTML = "";
    selectedIndex = -1;

    if(text.length == 0){

        results.style.display = "none";
        return;

    }

    currentMatches = world.filter(item =>

        item.name.toLowerCase().includes(text)

    );

    currentMatches.forEach(item=>{

        const div = document.createElement("div");

        div.className="search-result";

        div.textContent=item.name;
    

div.onclick = () => {

    openEntry(item);
    clearSearch();
};

        results.appendChild(div);

    });

    results.style.display =
    currentMatches.length > 0 ? "block" : "none";

});

document.addEventListener("click", function(e) {

    const container = document.getElementById("search-container");

    if (!container.contains(e.target)) {

        results.style.display = "none";
        results.innerHTML = "";

    }

});



function clearSearch() {

    search.value = "";
    results.innerHTML = "";
    results.style.display = "none";

}

search.addEventListener("keydown", function(e){

    if(currentMatches.length === 0)
        return;

    if(e.key === "ArrowDown"){

        e.preventDefault();

        selectedIndex++;

        if(selectedIndex >= currentMatches.length)
            selectedIndex = 0;

        updateSelection();

    }

    else if(e.key === "ArrowUp"){

        e.preventDefault();

        selectedIndex--;

        if(selectedIndex < 0)
            selectedIndex = currentMatches.length - 1;

        updateSelection();

    }

    else if(e.key === "Enter"){

        e.preventDefault();

        const index =
            selectedIndex >= 0
            ? selectedIndex
            : 0;

        openEntry(currentMatches[index]);
        clearSearch();

    }

});

function updateSelection() {

    const items = results.querySelectorAll(".search-result");

    items.forEach((item, index) => {

        item.classList.toggle(
            "selected",
            index === selectedIndex
        );

    });

    if (index === selectedIndex) {
    item.scrollIntoView({
        block: "nearest"
    });
    }

}