let world = [];
const wikiIndex = {};

async function loadWorld() {

    world = await fetch("data/wikiIndex.json?v=unlinked-articles-1")
        .then(r => r.json());

    world.forEach(item => {
        wikiIndex[item.name] = item;
    });

    world
        .filter(item => item.category === "settlement")
        .forEach(addCity);

    updateLabels();

}