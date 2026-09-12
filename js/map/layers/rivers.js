function addRiver(river){

    drawLine(

        river,

        {
            ...riverStyles[river.class],
            layer: layers.rivers,
            type: "rivers",
            pane: "rivers",
            hover: true
        }

    );

}

let rivers = [];
let riversFileHandle = null;
let riversReady;

async function loadRivers(){

    rivers = await fetch("js/map/layers/rivers.json")
        .then(response => {

            if(!response.ok)
                throw new Error(`Could not load rivers: ${response.status}`);

            return response.json();

        });

    rivers.forEach(addRiver);

}

function downloadRiversFile(){

    const file = new Blob([
        JSON.stringify(rivers, null, 4) + "\n"
    ], { type: "application/json" });

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = "rivers.json";
    link.click();

    URL.revokeObjectURL(url);

}

async function saveRiversFile(){

    const contents = JSON.stringify(rivers, null, 4) + "\n";

    try {

        if(window.showOpenFilePicker && !riversFileHandle){

            [riversFileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: "River data",
                    accept: { "application/json": [".json"] }
                }]
            });

        }

        if(riversFileHandle){

            const writable = await riversFileHandle.createWritable();
            await writable.write(contents);
            await writable.close();
            return true;

        }

    } catch(error){

        if(error.name === "AbortError")
            return false;

        console.error("Could not save rivers file.", error);

    }

    downloadRiversFile();
    return true;

}

async function addRiverToFile(river){

    await riversReady;
    rivers.push(river);
    addRiver(river);

    return saveRiversFile();

}

riversReady = loadRivers().catch(error => {

    console.error(error);
    alert("Rivers could not be loaded.");

});
