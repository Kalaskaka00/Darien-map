let isGM = localStorage.getItem("gmMode") === "true";
let currentPlayer = localStorage.getItem("currentPlayer") || null;

function setGMMode(enabled){

    isGM = enabled;

    localStorage.setItem("gmMode", enabled ? "true" : "false");

    // When entering GM mode, clear player login
    if(enabled) {
        currentPlayer = null;
        localStorage.setItem("currentPlayer", "");
    }

}

function toggleGMMode(){

    setGMMode(!isGM);

    location.reload();

}

function setCurrentPlayer(playerName){

    currentPlayer = playerName || null;

    localStorage.setItem("currentPlayer", playerName || "");

    // When setting a player (or clearing it), exit GM mode
    isGM = false;
    localStorage.setItem("gmMode", "false");

    updatePlayerStatus();

    location.reload();

}

document.addEventListener("keydown", function(e){

    if(e.altKey && e.key.toLowerCase() === "g"){

        e.preventDefault();
        toggleGMMode();

    }

});

console.log("GM mode:", isGM);
console.log("Current player:", currentPlayer);