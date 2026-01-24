/**
 * GAME.JS - THE CORE ENGINE
 * Shared Registry, Input Handling, and Game State
 */

// --- 1. THE SOURCE OF TRUTH (TILE REGISTRY) ---
// This ensures IDs are identical between Editor and Game.
const TILE_REGISTRY = {
    "floor_stone":  { id: 0,   color: "#333",    type: "walkable",     label: "Stone Floor",   cat: "walkable" },
    "grass":        { id: 1,   color: "#1a3300", type: "walkable",     label: "Grass",         cat: "walkable" },
    "wood":         { id: 2,   color: "#4d2600", type: "walkable",     label: "Wood Plank",    cat: "walkable" },
    "wall_brick":   { id: 20,  color: "#000",    type: "blocked",      label: "Brick Wall",    cat: "not_walkable" },
    "water":        { id: 21,  color: "#004466", type: "blocked",      label: "Deep Water",    cat: "not_walkable" },
    "fence":        { id: 22,  color: "#555",    type: "blocked",      label: "Iron Fence",    cat: "not_walkable" },
    "bush_hide":    { id: 50,  color: "#2d5a27", type: "cover",        label: "Hide Bush",     cat: "others" },
    "trap_spikes":  { id: 60,  color: "#660000", type: "hazard",       label: "Spikes",        cat: "others" },
    "scroll":       { id: 70,  color: "#ff00ff", type: "collect",      label: "Secret Scroll", cat: "collection" },
    "gold_exit":    { id: 99,  color: "#ffcc00", type: "exit",         label: "Escape Portal", cat: "collection" },
    "player_start": { id: 100, color: "#00ff00", type: "spawn",        label: "Player Start",  cat: "units" },
    "guard":        { id: 200, color: "#ff0000", type: "enemy",        label: "Guard",         cat: "units" },
    "boss":         { id: 201, color: "#800000", type: "enemy",        label: "Ninja Boss",    cat: "units" }
};

// Map IDs to Data objects for fast lookup during rendering
const TILE_DATA = Object.values(TILE_REGISTRY).reduce((acc, curr) => {
    acc[curr.id] = curr;
    return acc;
}, {});

// --- 2. ENGINE STATE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let currentMapData = null;
let inventory = [];
let camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
let touchDist = 0;
let isPencilMode = false; 
let showGrid = true;
let currentDrawCall = null;

const AVAILABLE_ITEMS = [
    { id: 'rice', name: 'Poison Rice', icon: '🍙' },
    { id: 'bomb', name: 'Smoke Bomb', icon: '💨' },
    { id: 'gas', name: 'Sleep Gas', icon: '🧪' },
    { id: 'potion', name: 'Health Pot', icon: '❤️' }
];

// --- 3. NAVIGATION & LOADING ---
function switchScreen(id) {
    document.querySelectorAll('.screen, #game-screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
}

function showMenu() { switchScreen('menu-screen'); }

function showMissionList() {
    switchScreen('mission-screen');
    const list = document.getElementById('level-list');
    // For local dev, you would usually fetch a list. Here we assume level1.json exists.
    list.innerHTML = `
        <div class="list-item" onclick="loadMission('level1.json')" 
             style="padding:15px; background:#222; margin:5px; border-radius:5px; cursor:pointer; border:1px solid #444;">
             MISSION 01: THE INFILTRATION
        </div>
    `;
}

async function loadMission(file) {
    try {
        const res = await fetch(file);
        const data = await res.json();
        // Handle full bundle format or simple map format
        currentMapData = data.map ? data.map : data;
        switchScreen('item-screen');
        showItemSelection();
    } catch(e) {
        alert("Mission file not found! Export from Editor and save as 'level1.json' first.");
    }
}

// --- 4. INVENTORY LOGIC ---
function showItemSelection() {
    const grid = document.getElementById('item-grid');
    grid.innerHTML = AVAILABLE_ITEMS.map(item => `
        <div class="item-card" onclick="addItem('${item.id}')">
            <div style="font-size:24px">${item.icon}</div>
            <div>${item.name}</div>
        </div>
    `).join('');
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
        slot.className = `slot ${item ? 'filled' : ''}`;
        if (item) {
            slot.innerHTML = `${item.icon}<div class="qty-badge">${item.qty}</div>`;
            slot.onclick = () => { item.qty--; if(item.qty <= 0) inventory.splice(i,1); updateInvUI(); };
        }
        display.appendChild(slot);
    }
}

// --- 5. UNIFIED INPUT (DRAG, ZOOM, PAINT) ---
function initInput(target, onPaint) {
    const getP = (e) => e.touches ? {x: e.touches[0].clientX, y: e.touches[0].clientY} : {x: e.clientX, y: e.clientY};

    target.addEventListener('touchstart', (e) => {
        if(e.touches.length === 2) {
            touchDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        } else {
            if(!isPencilMode || !onPaint) {
                camera.isDragging = true;
                camera.lastMouse = getP(e);
            } else onPaint(e);
        }
    }, {passive: false});

    target.addEventListener('touchmove', (e) => {
        if(e.touches.length === 2) {
            e.preventDefault();
            const d = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            camera.zoom = Math.min(Math.max(0.3, camera.zoom * (d/touchDist)), 4);
            touchDist = d;
            if(currentDrawCall) currentDrawCall();
        } else if(camera.isDragging) {
            const p = getP(e);
            camera.x += (p.x - camera.lastMouse.x)/camera.zoom;
            camera.y += (p.y - camera.lastMouse.y)/camera.zoom;
            camera.lastMouse = p;
            if(currentDrawCall) currentDrawCall();
        } else if(isPencilMode && onPaint) onPaint(e);
    }, {passive: false});

    target.onmousedown = (e) => {
        if(e.button === 0 && isPencilMode && onPaint) onPaint(e);
        else { camera.isDragging = true; camera.lastMouse = {x: e.clientX, y: e.clientY}; }
    };
    
    window.onmousemove = (e) => {
        if(!camera.isDragging) return;
        camera.x += (e.clientX - camera.lastMouse.x)/camera.zoom;
        camera.y += (e.clientY - camera.lastMouse.y)/camera.zoom;
        camera.lastMouse = {x: e.clientX, y: e.clientY};
        if(currentDrawCall) currentDrawCall();
    };

    window.onmouseup = window.ontouchend = () => { camera.isDragging = false; touchDist = 0; };
    window.onwheel = (e) => {
        camera.zoom = Math.min(Math.max(0.3, camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1)), 4);
        if(currentDrawCall) currentDrawCall();
    };
}

// --- 6. RENDER ENGINE ---
function startGame() {
    switchScreen('game-screen');
    currentDrawCall = drawGame;
    isPencilMode = false;
    initInput(canvas, null);
    drawGame();
}

function drawGame() {
    if (!currentMapData) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderGrid(ctx, canvas, currentMapData);
}

function renderGrid(cntx, canv, data) {
    cntx.clearRect(0,0,canv.width, canv.height);
    cntx.save();
    cntx.translate(canv.width/2, canv.height/2);
    cntx.scale(camera.zoom, camera.zoom);
    cntx.translate(camera.x, camera.y);
    
    const s = 64; 
    const stX = -(data.cols * s) / 2;
    const stY = -(data.rows * s) / 2;

    data.grid.forEach((id, i) => {
        const x = stX + (i % data.cols) * s;
        const y = stY + Math.floor(i / data.cols) * s;
        const tile = TILE_DATA[id];
        
        cntx.fillStyle = tile ? tile.color : "#000";
        cntx.fillRect(x, y, s, s);
        
        if(showGrid) {
            cntx.strokeStyle = "rgba(255,255,255,0.05)";
            cntx.lineWidth = 1/camera.zoom;
            cntx.strokeRect(x, y, s, s);
        }
    });
    cntx.restore();
}

window.addEventListener('resize', () => { if(currentDrawCall) currentDrawCall(); });
