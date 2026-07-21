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

    if(e.shiftKey && e.key.toLowerCase() === "g"){

        toggleGMMode();

    }

});

console.log("GM mode:", isGM);