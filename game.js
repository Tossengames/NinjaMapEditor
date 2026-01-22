const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Define colors for our tiles
const colors = {
    0: "#808080", // Floor (Gray)
    1: "#000000", // Wall (Black)
    2: "#33cc33", // Player (Green)
    3: "#ff3300", // Enemy (Red)
    4: "#ffcc00"  // Exit (Gold)
};

async function loadMap() {
    const mapFile = document.getElementById('mapSelector').value;
    
    try {
        const response = await fetch(mapFile);
        const mapData = await response.json();
        drawMap(mapData);
    } catch (error) {
        console.error("Error loading map:", error);
        alert("Make sure the JSON file exists!");
    }
}

function drawMap(map) {
    // Set canvas size based on map data
    canvas.width = map.cols * map.tilesize;
    canvas.height = map.rows * map.tilesize;

    // Loop through the grid array
    for (let i = 0; i < map.grid.length; i++) {
        const tileType = map.grid[i];
        
        // Calculate X and Y coordinates
        const x = (i % map.cols) * map.tilesize;
        const y = Math.floor(i / map.cols) * map.tilesize;

        // Draw the tile
        ctx.fillStyle = colors[tileType] || "#000";
        ctx.fillRect(x, y, map.tilesize, map.tilesize);
        
        // Optional: Draw a thin border around tiles
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.strokeRect(x, y, map.tilesize, map.tilesize);
    }
}

// Load default map on startup
window.onload = loadMap;
