const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const colors = {
    0: "#555555", // Floor (Darker Gray)
    1: "#222222", // Wall (Almost Black)
    2: "#44ff44", // Player (Neon Green)
    3: "#ff4444", // Enemy (Bright Red)
    4: "#ffff44"  // Exit (Yellow/Gold)
};

async function loadMap() {
    const mapFile = document.getElementById('mapSelector').value;
    
    // Clear canvas while loading
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    try {
        const response = await fetch(mapFile);
        if (!response.ok) throw new Error("File not found");
        
        const mapData = await response.json();
        drawMap(mapData);
    } catch (error) {
        console.error("Map Load Error:", error);
        ctx.fillStyle = "white";
        ctx.fillText("Error loading JSON: " + mapFile, 10, 20);
    }
}

function drawMap(map) {
    canvas.width = map.cols * map.tilesize;
    canvas.height = map.rows * map.tilesize;

    map.grid.forEach((tileType, index) => {
        const x = (index % map.cols) * map.tilesize;
        const y = Math.floor(index / map.cols) * map.tilesize;

        // Draw Tile
        ctx.fillStyle = colors[tileType] || "#000";
        ctx.fillRect(x, y, map.tilesize, map.tilesize);

        // Add subtle lighting effect to walls (Bevel)
        if (tileType === 1) {
            ctx.strokeStyle = "#444";
            ctx.strokeRect(x, y, map.tilesize, map.tilesize);
        }
    });
}
