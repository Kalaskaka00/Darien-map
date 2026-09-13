let world = [];
const wikiIndex = {};
let wikiMeta = {};

const currentYear = 3864;

async function loadWorld() {

    const [indexResponse, metadataResponse] = await Promise.all([
        fetch("data/wikiIndex.json"),
        fetch("data/wikiMeta.json")
    ]);

    world = await indexResponse.json();
    wikiMeta = await metadataResponse.json();

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

    const homeArticle = getHomeArticle();

    if(homeArticle)
        openArticle(homeArticle);
}