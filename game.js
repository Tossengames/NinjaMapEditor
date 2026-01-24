/**
 * GAME.JS - THE SHADOW ENGINE CORE
 */

// --- 1. THE REGISTRY ---
const TILE_REGISTRY = {
    "floor_stone":  { id: 0,   color: "#333",    type: "walkable",     label: "Stone Floor",   cat: "walkable" },
    "grass":        { id: 1,   color: "#1a3300", type: "walkable",     label: "Grass",         cat: "walkable" },
    "wall_brick":   { id: 20,  color: "#000",    type: "blocked",      label: "Brick Wall",    cat: "not_walkable" },
    "bush_hide":    { id: 50,  color: "#2d5a27", type: "cover",        label: "Hide Bush",     cat: "others" },
    "scroll":       { id: 70,  color: "#ff00ff", type: "collect",      label: "Secret Scroll", cat: "collection" },
    "gold_exit":    { id: 99,  color: "#ffcc00", type: "exit",         label: "Escape Portal", cat: "collection" },
    "player_start": { id: 100, color: "#00ff00", type: "spawn",        label: "Player Start",  cat: "units" },
    "guard":        { id: 200, color: "#ff0000", type: "enemy",        label: "Guard",         cat: "units" }
};

const TILE_DATA = Object.values(TILE_REGISTRY).reduce((acc, curr) => { acc[curr.id] = curr; return acc; }, {});

// --- 2. GLOBAL STATE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let currentMapData = null;
let inventory = [];
let camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
let touchDist = 0;
let isPencilMode = false;
let currentDrawCall = null;
let showGrid = true;

// Character Logic
let player = { x: 0, y: 0, targetX: 0, targetY: 0, isMoving: false, speed: 0.18 };

const AVAILABLE_ITEMS = [
    { id: 'rice', name: 'Poison Rice', icon: '🍙' },
    { id: 'bomb', name: 'Smoke Bomb', icon: '💨' },
    { id: 'potion', name: 'Health Pot', icon: '❤️' }
];

// --- 3. NAVIGATION & SCREEN MANAGEMENT ---
function switchScreen(id) {
    document.querySelectorAll('.screen, #game-screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
    // Reset camera when switching views
    camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
}

function showMenu() { switchScreen('menu-screen'); currentDrawCall = null; }

function showMissionList() {
    switchScreen('mission-screen');
    const list = document.getElementById('level-list');
    list.innerHTML = `<div onclick="loadMission('level1.json')" style="padding:15px; background:#222; margin:5px; border-radius:5px; cursor:pointer; border:1px solid #444;">MISSION 01: NIGHTFALL</div>`;
}

// --- 4. GAME ENGINE LOGIC ---
async function loadMission(file) {
    try {
        const res = await fetch(file);
        const data = await res.json();
        currentMapData = data.map || data;
        
        // Auto-Spawn Character at Player Start tile
        const spawnIdx = currentMapData.grid.indexOf(100);
        if(spawnIdx !== -1) {
            const s = 64;
            const stX = -(currentMapData.cols * s)/2;
            const stY = -(currentMapData.rows * s)/2;
            const px = spawnIdx % currentMapData.cols;
            const py = Math.floor(spawnIdx / currentMapData.cols);
            player.x = player.targetX = stX + (px * s) + s/2;
            player.y = player.targetY = stY + (py * s) + s/2;
        }
        switchScreen('item-screen');
        showItemSelection();
    } catch(e) { alert("Mission file error! Did you export it as level1.json?"); }
}

function startGame() {
    switchScreen('game-screen');
    currentDrawCall = gameLoop;
    initInput(canvas, handleGameTap);
    requestAnimationFrame(gameLoop);
}

// --- 5. RENDERER (SHARED) ---
function renderGrid(cntx, canv, data) {
    if(!data) return;
    cntx.clearRect(0,0,canv.width, canv.height);
    cntx.save();
    cntx.translate(canv.width/2, canv.height/2);
    cntx.scale(camera.zoom, camera.zoom);
    cntx.translate(camera.x, camera.y);

    const s = 64, stX = -(data.cols * s)/2, stY = -(data.rows * s)/2;
    data.grid.forEach((id, i) => {
        const x = stX + (i % data.cols) * s, y = stY + Math.floor(i / data.cols) * s;
        cntx.fillStyle = TILE_DATA[id] ? TILE_DATA[id].color : "#000";
        cntx.fillRect(x, y, s, s);
        
        if (showGrid) {
            cntx.strokeStyle = "rgba(255,255,255,0.05)";
            cntx.lineWidth = 1 / camera.zoom;
            cntx.strokeRect(x, y, s, s);
        }
    });
    cntx.restore();
}

// --- 6. UNIFIED INPUT (ZOOM & PAN & MODE) ---
function initInput(target, onPaint) {
    const getP = (e) => e.touches ? {x: e.touches[0].clientX, y: e.touches[0].clientY} : {x: e.clientX, y: e.clientY};

    target.onmousedown = (e) => {
        if(e.button === 0 && isPencilMode && onPaint) {
            onPaint(e);
        } else {
            camera.isDragging = true;
            camera.lastMouse = getP(e);
        }
    };

    window.onmousemove = (e) => {
        // Continuous painting
        if(isPencilMode && e.buttons === 1 && onPaint) {
            onPaint(e);
            return;
        }
        // Panning
        if(!camera.isDragging) return;
        const p = getP(e);
        camera.x += (p.x - camera.lastMouse.x) / camera.zoom;
        camera.y += (p.y - camera.lastMouse.y) / camera.zoom;
        camera.lastMouse = p;
        if(currentDrawCall === renderEditor) renderEditor();
    };

    window.onmouseup = () => { camera.isDragging = false; };

    // Scroll Zoom
    target.onwheel = (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        camera.zoom = Math.min(Math.max(0.3, camera.zoom * zoomDelta), 4);
        if(currentDrawCall) currentDrawCall(); 
    };
}

// --- 7. GAME LOOP & DRAW ---
function gameLoop() {
    if(currentDrawCall !== gameLoop) return;
    
    // Smooth Movement (Lerp)
    if(player.isMoving) {
        player.x += (player.targetX - player.x) * player.speed;
        player.y += (player.targetY - player.y) * player.speed;
        if(Math.hypot(player.targetX - player.x, player.targetY - player.y) < 1) player.isMoving = false;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderGrid(ctx, canvas, currentMapData);

    // Draw Character
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(camera.x, camera.y);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 20, 0, Math.PI*2);
    ctx.fillStyle = "#00ff00";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    requestAnimationFrame(gameLoop);
}

function handleGameTap(e) {
    const rect = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    const mx = (p.clientX - rect.left - canvas.width/2)/camera.zoom - camera.x;
    const my = (p.clientY - rect.top - canvas.height/2)/camera.zoom - camera.y;

    const s = 64, stX = -(currentMapData.cols * s)/2, stY = -(currentMapData.rows * s)/2;
    const tx = Math.floor((mx - stX)/s), ty = Math.floor((my - stY)/s);

    if(tx >= 0 && tx < currentMapData.cols && ty >= 0 && ty < currentMapData.rows) {
        const tid = currentMapData.grid[ty * currentMapData.cols + tx];
        if(TILE_DATA[tid].type !== 'blocked') {
            player.targetX = stX + (tx * s) + s/2;
            player.targetY = stY + (ty * s) + s/2;
            player.isMoving = true;
        }
    }
}

// --- 8. INVENTORY UI ---
function showItemSelection() {
    const grid = document.getElementById('item-grid');
    grid.innerHTML = AVAILABLE_ITEMS.map(item => `
        <div class="item-card" onclick="addItem('${item.id}')">
            <div style="font-size:20px">${item.icon}</div>
            <div>${item.name}</div>
        </div>`).join('');
    updateInvUI();
}

function addItem(id) {
    const itemData = AVAILABLE_ITEMS.find(i => i.id === id);
    const existing = inventory.find(i => i.id === id);
    if (inventory.reduce((sum, i) => sum + i.qty, 0) >= 5) return;
    if (existing) existing.qty++;
    else if (inventory.length < 3) inventory.push({ ...itemData, qty: 1 });
    updateInvUI();
}

function updateInvUI() {
    const display = document.getElementById('loadout-display');
    display.innerHTML = "";
    for (let i = 0; i < 3; i++) {
        const item = inventory[i];
        const slot = document.createElement('div');
        slot.className = `slot`;
        if (item) {
            slot.innerHTML = `${item.icon}<div class="qty-badge">${item.qty}</div>`;
            slot.onclick = () => { item.qty--; if(item.qty <= 0) inventory.splice(i,1); updateInvUI(); };
        }
        display.appendChild(slot);
    }
}
