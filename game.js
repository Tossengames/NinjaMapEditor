const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// CONFIGURATION: Add your JSON filenames here
const levelFiles = ["level1.json", "level2.json"];

let currentMapData = null;

// Tile Color Map
const tileColors = {
    0: "#555555", // Floor
    1: "#111111", // Wall
    2: "#00ff00", // Player
    3: "#ff3300", // Enemy
    4: "#ffcc00"  // Exit
};

// 1. Initialize the scrollable menu
function initMenu() {
    const list = document.getElementById('level-list');
    list.innerHTML = ""; // Clear list
    
    levelFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'level-item';
        // Display name without .json extension
        item.innerText = file.replace('.json', '').toUpperCase();
        item.onclick = () => loadLevelInfo(file);
        list.appendChild(item);
    });
}

// 2. Fetch JSON and show the Info Screen
async function loadLevelInfo(fileName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error("Could not find " + fileName);
        
        currentMapData = await response.json();

        // Populate Info Screen
        document.getElementById('info-name').innerText = currentMapData.name;
        document.getElementById('info-story').innerText = currentMapData.story;
        document.getElementById('info-rules').innerText = currentMapData.rules;

        // Switch UI
        switchScreen('info-screen');
    } catch (err) {
        alert(err.message);
    }
}

// 3. Draw the map to the canvas
function startGame() {
    if (!currentMapData) return;
    
    switchScreen('game-screen');

    const map = currentMapData;
    canvas.width = map.cols * map.tilesize;
    canvas.height = map.rows * map.tilesize;

    // Clear previous drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the Grid
    map.grid.forEach((tileID, index) => {
        const x = (index % map.cols) * map.tilesize;
        const y = Math.floor(index / map.cols) * map.tilesize;

        ctx.fillStyle = tileColors[tileID] || "#000";
        ctx.fillRect(x, y, map.tilesize, map.tilesize);

        // Add a subtle border to tiles for better visibility
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.strokeRect(x, y, map.tilesize, map.tilesize);
    });
}

// Helper: Switch between screens
function switchScreen(screenId) {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('info-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    
    document.getElementById(screenId).classList.remove('hidden');
}

function showMenu() {
    switchScreen('menu-screen');
}

// Run on boot
window.onload = initMenu;
