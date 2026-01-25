const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const levelFiles = ["level1.json", "level2.json"]; 
const AVAILABLE_ITEMS = [
    { id: 'rice', name: 'Poison Rice', icon: '🍙', effect: 'distract' },
    { id: 'bomb', name: 'Smoke Bomb', icon: '💨', effect: 'blind' },
    { id: 'gas', name: 'Sleep Gas', icon: '🧪', effect: 'sleep' },
    { id: 'potion', name: 'Health Pot', icon: '❤️', effect: 'heal' },
    { id: 'trap', name: 'Caltrops', icon: '🪤', effect: 'slow' }
];

// Enhanced tile system
const TILE_DATA = {
    0: { color: '#444', name: 'floor', walkable: true }, 
    20: { color: '#111', name: 'wall', walkable: false },
    50: { color: '#1a3300', name: 'grass', walkable: true, hide: true },
    70: { color: '#ff00ff', name: 'dark', walkable: true, hide: true },
    80: { color: '#2a2a5a', name: 'water', walkable: false },
    90: { color: '#5a2a2a', name: 'blood', walkable: true },
    99: { color: '#ffcc00', name: 'exit', walkable: true },
    100: { color: '#00ff00', name: 'start', walkable: true },
    101: { color: '#00ff88', name: 'hiding', walkable: true, hide: true },
    200: { color: '#ff0000', name: 'danger', walkable: true },
    201: { color: '#ff4444', name: 'enemy', walkable: true },
    202: { color: '#ff8844', name: 'boss', walkable: true },
    300: { color: '#ffff00', name: 'objective', walkable: true },
    301: { color: '#ffaa00', name: 'steal', walkable: true },
    302: { color: '#aa00ff', name: 'target', walkable: true }
};

// Game state
let currentMapData = null;
let inventory = [];
let camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
let touchDist = 0;
let gameState = {
    player: { x: 0, y: 0, hidden: false, health: 100, spotted: false },
    enemies: [],
    objectives: [],
    rules: [],
    completed: [],
    gameOver: false,
    turn: 0
};

// --- NAVIGATION ---
function switchScreen(id) {
    document.querySelectorAll('.screen, #game-screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function showMenu() { 
    gameState.gameOver = false;
    switchScreen('menu-screen'); 
}

function showMissionList() {
    switchScreen('mission-screen');
    const list = document.getElementById('level-list');
    list.innerHTML = levelFiles.map(f => `<div class="list-item" onclick="loadMission('${f}')">${f.replace('.json', '').toUpperCase()}</div>`).join('');
}

async function loadMission(file) {
    try {
        const res = await fetch(file);
        currentMapData = await res.json();
        
        // Update UI
        document.getElementById('info-name').innerText = currentMapData.name;
        document.getElementById('info-story').innerText = currentMapData.story;
        document.getElementById('info-rules').innerText = currentMapData.rules ? currentMapData.rules.join(', ') : 'None';
        document.getElementById('info-objectives').innerText = currentMapData.objectives ? currentMapData.objectives.join(', ') : 'None';
        
        switchScreen('info-screen');
    } catch (error) {
        alert(`Failed to load mission: ${error}`);
        showMissionList();
    }
}

// --- INVENTORY LOGIC ---
function showItemSelection() {
    switchScreen('item-screen');
    inventory = [];
    const grid = document.getElementById('item-grid');
    grid.innerHTML = AVAILABLE_ITEMS.map(item => `
        <div class="item-card" id="card-${item.id}" onclick="addItem('${item.id}')">
            <div style="font-size:24px">${item.icon}</div>
            <div>${item.name}</div>
        </div>
    `).join('');
    updateInvUI();
}

function addItem(id) {
    const itemData = AVAILABLE_ITEMS.find(i => i.id === id);
    const existing = inventory.find(i => i.id === id);
    const totalQty = inventory.reduce((sum, i) => sum + i.qty, 0);

    if (totalQty >= 5) return alert("Max capacity (5) reached!");

    if (existing) {
        existing.qty++;
    } else {
        if (inventory.length >= 3) return alert("Max 3 types allowed!");
        inventory.push({ ...itemData, qty: 1 });
    }
    updateInvUI();
}

function removeItem(id) {
    const item = inventory.find(i => i.id === id);
    if (item) {
        item.qty--;
        if (item.qty <= 0) inventory = inventory.filter(i => i.id !== id);
    }
    updateInvUI();
}

function updateInvUI() {
    const display = document.getElementById('loadout-display');
    const totalQty = inventory.reduce((sum, i) => sum + i.qty, 0);
    document.getElementById('total-qty-label').innerText = `Total: ${totalQty} / 5`;
    
    display.innerHTML = "";
    for (let i = 0; i < 3; i++) {
        const item = inventory[i];
        const slot = document.createElement('div');
        slot.className = `slot ${item ? 'filled' : ''}`;
        if (item) {
            slot.innerHTML = `${item.icon}<div class="qty-badge">${item.qty}</div>`;
            slot.onclick = () => removeItem(item.id);
        }
        display.appendChild(slot);
    }

    AVAILABLE_ITEMS.forEach(it => {
        const card = document.getElementById(`card-${it.id}`);
        if(card) card.classList.toggle('active', inventory.some(inv => inv.id === it.id));
    });
}

// --- GAME LOGIC ---
function startGame() {
    if (!currentMapData) return;
    
    // Initialize game state from map data
    gameState = {
        player: { 
            x: currentMapData.player?.x || 1, 
            y: currentMapData.player?.y || 1, 
            hidden: false, 
            health: 100, 
            spotted: false,
            inHiding: false
        },
        enemies: currentMapData.enemies ? [...currentMapData.enemies] : [],
        objectives: currentMapData.objects ? [...currentMapData.objects] : [],
        rules: currentMapData.rules ? [...currentMapData.rules] : [],
        completed: [],
        gameOver: false,
        turn: 0
    };
    
    switchScreen('game-screen');
    updateHUD();
    updateToolbar();
    camera.x = 0; 
    camera.y = 0; 
    camera.zoom = 1;
    
    // Center camera on player
    const size = currentMapData.tilesize;
    camera.x = -((gameState.player.x * size) - canvas.width/2);
    camera.y = -((gameState.player.y * size) - canvas.height/2);
    
    draw();
}

function updateHUD() {
    if (!currentMapData) return;
    
    document.getElementById('hud-name').innerText = currentMapData.name;
    
    const statusEl = document.getElementById('hud-status');
    if (gameState.player.spotted) {
        statusEl.innerText = 'SPOTTED!';
        statusEl.className = 'status bad';
    } else if (gameState.player.hidden) {
        statusEl.innerText = 'HIDDEN';
        statusEl.className = 'status good';
    } else {
        statusEl.innerText = 'VISIBLE';
        statusEl.className = 'status warning';
    }
    
    const totalObj = gameState.objectives.length;
    const completed = gameState.completed.length;
    document.getElementById('hud-objectives').innerText = `${completed}/${totalObj}`;
    
    // Update character circle content
    const charCircle = document.getElementById('char-circle');
    if (gameState.player.hidden) {
        charCircle.innerHTML = "🫥";
        charCircle.style.borderColor = "#666";
    } else if (gameState.player.spotted) {
        charCircle.innerHTML = "🚨";
        charCircle.style.borderColor = "#ff0000";
    } else {
        charCircle.innerHTML = "👤";
        charCircle.style.borderColor = "var(--gold)";
    }
}

function updateToolbar() {
    const container = document.getElementById('dynamic-items');
    container.innerHTML = inventory.map(item => `
        <div class="tool-btn special" onclick="useItem('${item.id}')">
            ${item.icon}<br>USE
            <div class="qty-badge">${item.qty}</div>
        </div>
    `).join('');
}

function useItem(id) {
    const item = inventory.find(i => i.id === id);
    if (item && item.qty > 0) {
        item.qty--;
        if (item.qty <= 0) inventory = inventory.filter(i => i.id !== id);
        
        // Apply item effect
        switch(item.effect) {
            case 'distract':
                alert(`${item.name} thrown! Enemies are distracted.`);
                // Implement distraction logic
                break;
            case 'blind':
                alert(`${item.name} deployed! Reduced enemy vision.`);
                break;
            case 'sleep':
                alert(`${item.name} released! Nearby enemies may fall asleep.`);
                break;
            case 'heal':
                gameState.player.health = Math.min(100, gameState.player.health + 30);
                alert(`${item.name} used! Health restored.`);
                updateHUD();
                break;
            case 'slow':
                alert(`${item.name} scattered! Enemies will move slower.`);
                break;
        }
        
        updateToolbar();
        draw();
    }
}

function gameAction(action) {
    if (gameState.gameOver) return;
    
    switch(action) {
        case 'move':
            alert("Movement system will be implemented separately.");
            break;
        case 'hide':
            toggleHide();
            break;
        case 'wait':
            endTurn();
            break;
    }
}

function toggleHide() {
    const tileIndex = gameState.player.y * currentMapData.cols + gameState.player.x;
    const tileId = currentMapData.grid[tileIndex];
    const tileInfo = TILE_DATA[tileId];
    
    if (tileInfo && tileInfo.hide) {
        gameState.player.hidden = !gameState.player.hidden;
        gameState.player.inHiding = gameState.player.hidden;
        alert(gameState.player.hidden ? "You're now hiding!" : "You left hiding spot.");
        updateHUD();
        draw();
    } else {
        alert("No hiding spot here!");
    }
}

function endTurn() {
    gameState.turn++;
    
    // Enemy AI (simple placeholder - will be moved to separate script)
    gameState.enemies.forEach(enemy => {
        if (!gameState.player.hidden) {
            const dist = Math.abs(enemy.x - gameState.player.x) + Math.abs(enemy.y - gameState.player.y);
            if (dist <= 3) {
                gameState.player.spotted = true;
                alert("Enemy spotted you!");
            }
        }
        
        // Simple patrol
        if (enemy.patrol && enemy.patrol.length > 0) {
            const next = enemy.patrol[gameState.turn % enemy.patrol.length];
            enemy.x = next[0];
            enemy.y = next[1];
        }
    });
    
    // Check rules
    if (gameState.rules.includes("don't be spotted") && gameState.player.spotted) {
        gameOver("You were spotted! Mission failed.");
        return;
    }
    
    updateHUD();
    draw();
}

function gameOver(message) {
    gameState.gameOver = true;
    alert(message + "\n\nReturning to menu...");
    setTimeout(() => showMenu(), 1000);
}

// --- DRAWING & CAMERA ---
function initInput() {
    const getPos = (e) => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    const start = (e) => {
        if (e.touches && e.touches.length === 2) {
            touchDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        } else {
            camera.isDragging = true;
            camera.lastMouse = getPos(e);
        }
    };
    const move = (e) => {
        if (e.touches && e.touches.length === 2) {
            const curDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            if (touchDist > 0) camera.zoom = Math.min(Math.max(0.4, camera.zoom * (curDist / touchDist)), 4);
            touchDist = curDist;
            draw();
        } else if (camera.isDragging) {
            const pos = getPos(e);
            camera.x += (pos.x - camera.lastMouse.x) / camera.zoom;
            camera.y += (pos.y - camera.lastMouse.y) / camera.zoom;
            camera.lastMouse = pos;
            draw();
        }
    };
    
    // Remove click handlers for movement
    canvas.onclick = null;
    
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('touchstart', start, {passive: false});
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', (e) => { if(e.touches.length > 1) e.preventDefault(); move(e); }, {passive: false});
    window.addEventListener('mouseup', () => camera.isDragging = false);
    window.addEventListener('touchend', () => { camera.isDragging = false; touchDist = 0; });
    window.addEventListener('wheel', e => {
        camera.zoom = Math.min(Math.max(0.4, camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1)), 4);
        draw();
    }, {passive: false});
}

function draw() {
    if (!currentMapData || document.getElementById('game-screen').classList.contains('hidden')) return;
    
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(camera.x, camera.y);

    const map = currentMapData;
    const size = map.tilesize;
    const startX = -(map.cols * size) / 2;
    const startY = -(map.rows * size) / 2;

    // Draw tiles
    map.grid.forEach((id, i) => {
        const x = startX + (i % map.cols) * size;
        const y = startY + Math.floor(i / map.cols) * size;
        const tileInfo = TILE_DATA[id];
        
        if (tileInfo) {
            ctx.fillStyle = tileInfo.color;
            ctx.fillRect(x, y, size, size);
            
            // Add tile labels for special tiles
            if (id >= 99) {
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(tileInfo.name.charAt(0).toUpperCase(), x + size/2, y + size/2);
            }
        }
        
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.strokeRect(x, y, size, size);
    });

    // Draw enemies
    gameState.enemies.forEach(enemy => {
        const x = startX + enemy.x * size;
        const y = startY + enemy.y * size;
        
        // Enemy body
        ctx.fillStyle = enemy.type === 'boss' ? '#ff8844' : '#ff4444';
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/3, 0, Math.PI * 2);
        ctx.fill();
        
        // Enemy label
        ctx.fillStyle = 'white';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.type.toUpperCase(), x + size/2, y - 5);
    });

    // Draw objectives
    gameState.objectives.forEach(obj => {
        const x = startX + obj.x * size;
        const y = startY + obj.y * size;
        
        ctx.fillStyle = obj.type === 'documents' ? '#ffff00' : 
                       obj.type === 'target' ? '#aa00ff' : '#ffaa00';
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/4, 0, Math.PI * 2);
        ctx.fill();
        
        // Check if completed
        if (gameState.completed.includes(obj.name)) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + size/4, y + size/2);
            ctx.lineTo(x + size/2, y + size*3/4);
            ctx.lineTo(x + size*3/4, y + size/4);
            ctx.stroke();
        }
    });

    // Draw player
    const playerX = startX + gameState.player.x * size;
    const playerY = startY + gameState.player.y * size;
    
    if (gameState.player.hidden) {
        ctx.fillStyle = 'rgba(100,100,100,0.5)';
        ctx.strokeStyle = 'rgba(200,200,200,0.5)';
    } else if (gameState.player.spotted) {
        ctx.fillStyle = '#ff0000';
        ctx.strokeStyle = '#ff8888';
    } else {
        ctx.fillStyle = '#00ff00';
        ctx.strokeStyle = '#88ff88';
    }
    
    ctx.beginPath();
    ctx.arc(playerX + size/2, playerY + size/2, size/3, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Player health bar
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(playerX, playerY - 8, size, 4);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(playerX, playerY - 8, size * (gameState.player.health / 100), 4);

    ctx.restore();
}

function togglePause(p) { 
    document.getElementById('pause-screen').classList.toggle('hidden', !p); 
}

// Initialize
window.onload = () => { 
    initInput(); 
    window.onresize = draw;
};