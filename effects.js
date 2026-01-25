// At the end of effects.js, add the global draw function
// This should replace any existing draw function in other files

function draw() {
    if (!currentMapData || document.getElementById('game-screen').classList.contains('hidden')) return;
    
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
    
    // Update camera and effects
    Camera.update();
    Effects.update();
    
    Camera.applyTransform();
    
    const map = currentMapData;
    const size = map.tilesize;
    const startX = -(map.cols * size) / 2;
    const startY = -(map.rows * size) / 2;
    
    // Draw tiles with Tenchu-style colors
    map.grid.forEach((id, i) => {
        const x = startX + (i % map.cols) * size;
        const y = startY + Math.floor(i / map.cols) * size;
        const tileInfo = TILE_DATA[id];
        
        if (tileInfo) {
            ctx.fillStyle = tileInfo.color;
            ctx.fillRect(x, y, size, size);
        }
        
        // Draw tile border
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.strokeRect(x, y, size, size);
    });
    
    // Draw highlighted tiles
    Game.highlightedTiles.forEach(tile => {
        const x = startX + tile.x * size;
        const y = startY + tile.y * size;
        
        ctx.fillStyle = tile.color;
        ctx.globalAlpha = tile.alpha;
        ctx.fillRect(x, y, size, size);
        ctx.globalAlpha = 1;
    });
    
    // Draw enemies
    EnemyManager.drawAll(ctx, startX, startY, size);
    
    // Draw items
    Items.drawAll(ctx, startX, startY, size);
    
    // Draw player
    const playerX = startX + Player.x * size;
    const playerY = startY + Player.y * size;
    
    // Player with Tenchu-style appearance
    if (Player.hidden) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeStyle = 'rgba(100,100,100,0.5)';
    } else if (Player.spotted) {
        ctx.fillStyle = '#ff0000';
        ctx.strokeStyle = '#ff6666';
    } else {
        ctx.fillStyle = '#00aa00';
        ctx.strokeStyle = '#00ff00';
    }
    
    // Draw player as ninja silhouette
    ctx.beginPath();
    ctx.arc(playerX + size/2, playerY + size/2, size/3, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw player health bar
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(playerX, playerY - 8, size, 4);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(playerX, playerY - 8, size * (Player.health / Player.maxHealth), 4);
    
    // Draw health text
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Player.health}/${Player.maxHealth}`, playerX + size/2, playerY - 10);
    
    // Draw effects
    Effects.drawAll(ctx, startX, startY, size);
    
    Camera.restoreTransform();
}