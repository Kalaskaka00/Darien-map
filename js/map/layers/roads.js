function addRoad(road){

    drawLine(

        road,

        {
            ...roadStyles[road.class],
            layer: layers.roads,
            type: "roads",
            shadow: true,
            hover: true
        }

    );

}

let roads = [];
let roadsFileHandle = null;
let roadsReady;

async function loadRoads(){

    roads = await fetch("js/map/layers/roads.json")
        .then(response => {

            if(!response.ok)
                throw new Error(`Could not load roads: ${response.status}`);

            return response.json();

        });

    roads
        .sort((left, right) => roadStyles[left.class].weight - roadStyles[right.class].weight)
        .forEach(addRoad);

}

function downloadRoadsFile(){

    const file = new Blob([
        JSON.stringify(roads, null, 4) + "\n"
    ], { type: "application/json" });

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = "roads.json";
    link.click();

    URL.revokeObjectURL(url);

}

async function saveRoadsFile(){

    const contents = JSON.stringify(roads, null, 4) + "\n";

    try {

        if(window.showOpenFilePicker && !roadsFileHandle){

            [roadsFileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: "Road data",
                    accept: { "application/json": [".json"] }
                }]
            });

        }

        if(roadsFileHandle){

            const writable = await roadsFileHandle.createWritable();
            await writable.write(contents);
            await writable.close();
            return true;

        }

    } catch(error){

        if(error.name === "AbortError")
            return false;

        console.error("Could not save roads file.", error);

    }

    downloadRoadsFile();
    return true;

}

async function addRoadToFile(road){

    await roadsReady;
    roads.push(road);
    addRoad(road);
    orderLineLayers(layers.roads);

    return saveRoadsFile();

}

async function saveRoadToFile(road){

    await roadsReady;

    const index = roads.findIndex(item => item.id === road.id);

    if(index === -1)
        return false;

    roads[index] = road;

    return saveRoadsFile();

}

roadsReady = loadRoads().catch(error => {

    console.error(error);
    alert("Roads could not be loaded.");

});
