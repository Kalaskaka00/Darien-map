const decorationsLayer = registerLayer("decorations", "There be dragons");
let decorationInstances = [];
let showAllDecorations = false;
let decorationsLoaded = false;
let decorationPreviewTimer = null;
const decorationPreviewStates = new Map();

function isValidDecoration(instance){

    return instance &&
        typeof instance.id === "string" &&
        instance.id.trim() !== "" &&
        Array.isArray(instance.coordinates) &&
        instance.coordinates.length === 2 &&
        instance.coordinates.every(Number.isFinite) &&
        Number.isFinite(instance.weight) &&
        instance.weight > 0 &&
        Array.isArray(instance.images) &&
        instance.images.length > 0 &&
        instance.images.every(image =>
            image &&
            typeof image.src === "string" &&
            image.src.trim() !== "" &&
            Number.isFinite(image.scale) &&
            image.scale > 0
        );

}

function validateDecorationConfig(instances){

    const {minimum, maximum, iconSize} = CONFIG.map.decorations;

    if(!Array.isArray(instances) || !instances.every(isValidDecoration))
        throw new Error("Decoration data must be an array of instances with an id, coordinates, positive weight, and images with a path and positive scale.");

    if(new Set(instances.map(instance => instance.id)).size !== instances.length)
        throw new Error("Decoration instance ids must be unique.");

    if(!Number.isInteger(minimum) || minimum < 0 ||
        !Number.isInteger(maximum) || maximum < minimum)
        throw new Error("Decoration minimum and maximum must be non-negative integers, with maximum at least minimum.");

    if(minimum > instances.length)
        throw new Error(`Decoration minimum (${minimum}) exceeds the ${instances.length} configured instances.`);

    if(!Number.isFinite(iconSize) || iconSize <= 0)
        throw new Error("Decoration iconSize must be a positive number.");

}

function chooseWeightedDecorations(instances, count){

    const remaining = [...instances];
    const selected = [];

    while(selected.length < count){

        const largestWeight = Math.max(...remaining.map(instance => instance.weight));
        const totalWeight = remaining.reduce(
            (total, instance) => total + instance.weight / largestWeight,
            0
        );
        let selection = Math.random() * totalWeight;
        let selectedIndex = remaining.length - 1;

        for(let index = 0; index < remaining.length; index++){

            selection -= remaining[index].weight / largestWeight;

            if(selection < 0){
                selectedIndex = index;
                break;
            }

        }

        selected.push(remaining.splice(selectedIndex, 1)[0]);

    }

    return selected;

}

function escapeDecorationAttribute(value){

    return value.replace(/[&"<>']/g, character => ({
        "&": "&amp;",
        '"': "&quot;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;"
    })[character]);

}

function createDecorationIcon(instance, imageIndex, mirrored){

    const image = instance.images[imageIndex];
    const iconSize = CONFIG.map.decorations.iconSize * image.scale;

    return L.divIcon({
        className: mirrored ? "decoration-marker is-mirrored" : "decoration-marker",
        html: `<img src="${escapeDecorationAttribute(image.src)}" alt="">`,
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2]
    });

}

function renderDecoration(instance, imageIndex = null, mirrored = null){

    const selectedImageIndex = imageIndex === null
        ? Math.floor(Math.random() * instance.images.length)
        : imageIndex;
    const isMirrored = mirrored === null ? Math.random() < 0.5 : mirrored;
    const icon = createDecorationIcon(instance, selectedImageIndex, isMirrored);

    return L.marker(instance.coordinates, {
        icon,
        interactive: false,
        keyboard: false
    }).addTo(decorationsLayer);

}

function renderDecorations(){

    decorationsLayer.clearLayers();

    if(!decorationsLoaded)
        return;

    decorationPreviewStates.clear();

    const eligible = decorationInstances;
    const {minimum, maximum} = CONFIG.map.decorations;

    const count = showAllDecorations
        ? eligible.length
        : minimum + Math.floor(Math.random() * (Math.min(maximum, eligible.length) - minimum + 1));
    const visibleInstances = showAllDecorations
        ? eligible
        : chooseWeightedDecorations(eligible, count);

    if(showAllDecorations){

        visibleInstances.forEach(instance => {

            const state = {
                imageIndex: 0,
                mirrored: Math.random() < 0.5,
                marker: null
            };

            state.marker = renderDecoration(instance, state.imageIndex, state.mirrored);
            decorationPreviewStates.set(instance.id, state);

        });

    }else{

        visibleInstances.forEach(instance => renderDecoration(instance));

    }

}

function advanceDecorationPreview(){

    if(!showAllDecorations || !decorationsLoaded)
        return;

    decorationInstances.forEach(instance => {

        if(instance.images.length < 2)
            return;

        const state = decorationPreviewStates.get(instance.id);

        if(!state)
            return;

        state.imageIndex = (state.imageIndex + 1) % instance.images.length;
        state.marker.setIcon(
            createDecorationIcon(instance, state.imageIndex, state.mirrored)
        );

    });

}

function updateDecorationPreviewTimer(){

    if(decorationPreviewTimer !== null)
        window.clearInterval(decorationPreviewTimer);

    decorationPreviewTimer = null;

    if(showAllDecorations &&
        decorationsLoaded &&
        decorationInstances.some(instance => instance.images.length > 1))
        decorationPreviewTimer = window.setInterval(advanceDecorationPreview, 1000);

}

async function initializeDecorations(){

    try {

        const response = await fetch("js/map/layers/decorations.json");

        if(!response.ok)
            throw new Error(`Could not load decorations: ${response.status}`);

        const instances = await response.json();
        validateDecorationConfig(instances);
        decorationInstances = instances;
        decorationsLoaded = true;
        renderDecorations();
        updateDecorationPreviewTimer();

    } catch(error) {

        console.error("Could not initialize decorations:", error);
        alert(`Decorations could not be loaded: ${error.message}`);

    }

}

function setShowAllDecorations(showAll){

    showAllDecorations = showAll;
    renderDecorations();
    updateDecorationPreviewTimer();

}
