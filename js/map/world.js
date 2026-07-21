let world = [];
const wikiIndex = {};

const currentYear = 3864;

async function loadWorld() {

    world = await fetch("data/wikiIndex.json")
        .then(r => r.json());

    world.forEach(item => {
        wikiIndex[item.name] = item;
    });

    world
        .filter(item => item.category === "settlement")
        .filter(item => item.map)
        .forEach(addCity);
    updateLabels();

        world
        .filter(item => item.category === "nation")
        .forEach(addNation);
    updateLabels();

    console.log("World:", world);

    console.log(
    "Settlements:",
    world.filter(item => item.category === "settlement")
    );

    console.log(
    "Nations:",
    world.filter(item => item.category === "nation")
    );
}