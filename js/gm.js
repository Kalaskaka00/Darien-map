let isGM = localStorage.getItem("gmMode") === "true";

function setGMMode(enabled){

    isGM = enabled;

    localStorage.setItem("gmMode", enabled);

}

function toggleGMMode(){

    setGMMode(!isGM);

    location.reload();

}

document.addEventListener("keydown", function(e){

    if(e.altKey && e.key.toLowerCase() === "g"){

        e.preventDefault();
        toggleGMMode();

    }

});

console.log("GM mode:", isGM);