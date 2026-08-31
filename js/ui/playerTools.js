const playerToolsToggle = document.getElementById("player-tools-toggle");
const playerToolsPanel = document.getElementById("player-tools-panel");
const playerSelect = document.getElementById("player-select");
const playerStatusDisplay = document.getElementById("player-status-display");

// Initialize player dropdown
function initializePlayerTools() {
    // Add all configured players to dropdown
    Object.keys(CONFIG.players).forEach(playerName => {
        const option = document.createElement("option");
        option.value = playerName;
        option.textContent = playerName;
        playerSelect.appendChild(option);
    });

    // Set current player selection
    if(currentPlayer) {
        playerSelect.value = currentPlayer;
    }

    // Update display
    updatePlayerStatus();
}

// Update player status display
function updatePlayerStatus() {
    if(isGM) {
        playerStatusDisplay.textContent = "GM";
        playerStatusDisplay.style.color = "#8b0000";
    } else if(currentPlayer) {
        playerStatusDisplay.textContent = currentPlayer;
        const color = CONFIG.players[currentPlayer] || "#2d2417";
        playerStatusDisplay.style.color = color;
    } else {
        playerStatusDisplay.textContent = "No one";
        playerStatusDisplay.style.color = "#6f5328";
    }
}

// Toggle player tools panel
playerToolsToggle.onclick = function() {
    playerToolsPanel.classList.toggle("open");
    playerToolsToggle.classList.toggle("active");
};

// Handle player selection
playerSelect.addEventListener("change", function() {
    const selectedPlayer = this.value || null;
    setCurrentPlayer(selectedPlayer);
});

// Close panel when clicking outside
document.addEventListener("click", function(e) {
    const playerTools = document.getElementById("player-tools");
    if(!playerTools.contains(e.target)) {
        playerToolsPanel.classList.remove("open");
        playerToolsToggle.classList.remove("active");
    }
});

// Initialize on page load
initializePlayerTools();
