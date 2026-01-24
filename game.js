// --- 1. GLOBAL CONSTANTS & TILE DATA ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const levelFiles = ["level1.json"]; // Add your exported JSON filenames here
const AVAILABLE_ITEMS = [
    { id: 'rice', name: 'Poison Rice', icon: '🍙' },
    { id: 'bomb', name: 'Smoke Bomb', icon: '💨' },
    { id: 'gas', name: 'Sleep Gas', icon: '🧪' },
    { id: 'potion', name: 'Health Pot', icon: '❤️' },
    { id: 'trap', name: 'Caltrops', icon: '🪤' }
];

const TILE_DATA = {
    0: { color: '#333', type: 'walkable', label: 'Floor' },
    20: { color: '#000', type: 'blocked', label: 'Wall' },
    50: { color: '#1a3300', type: 'cover', label: 'Bush' },
    70: { color: '#ff00ff', type: 'retrieve', label: 'Scroll' },
    99: { color: '#ffcc00', type: 'reach_exit', label: 'Exit' },
    100: { color: '#00ff00', type: 'walkable', label: 'Player' },
    200: { color: '#ff0000', type: 'blocked', label: 'Enemy' }
};

// --- 2. ENGINE STATE ---
let currentMapData = null;
let inventory = []; // [{id, qty, etc}]
let camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
let touchDist = 0;
let isPencilMode = false; // Only true in Editor
let showGrid = true;
let currentDrawCall = null;

// --- 3. SCREEN NAVIGATION ---
function switchScreen(id) {
    document.querySelectorAll('.screen, #game-screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    // Reset camera when switching
    camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
}

function showMenu() { switchScreen('menu-screen'); }

function showMissionList() {
    switchScreen('mission-screen');
    const list = document.getElementById('level-list');
    if (levelFiles.length === 0) {
        list.innerHTML = `<p style="color:#666; padding:20px;">No missions found. Create one in the Editor!</p>`;
    } else {
        list.innerHTML = levelFiles.map(f => `
            <div class="list-item" onclick="loadMission('${f}')" 
                 style="padding:15px; background:#222; margin:5px; border-radius:5px; cursor:pointer; border:1px solid #444;">
                ${f.toUpperCase()}
            </div>
        `).join('');
    }
}

async function loadMission(file) {
    try {
        const res = await fetch(file);
        const data = await res.json();
        // Handle both raw map objects and the "Full Bundle" exports
        currentMapData = data.map ? data.map : data;
        switchScreen('item-screen');
        showItemSelection();
    } catch(e) {
        alert("Mission file not found! Make sure you created '" + file + "' in your folder.");
    }
}

// --- 4. INVENTORY & EQUIPMENT LOGIC ---
function showItemSelection() {
    const grid = document.getElementById('item-grid');
    grid.innerHTML = AVAILABLE_ITEMS.map(item => `
        <div class="item-card" onclick="addItem('${item.id}')">
            <div style="font-size:24px">${item.icon}</div>
            <div style="font-size:10px">${item.name}</div>
        </div>
    `).join('');
    updateInvUI();
}

function addItem(id) {
    const itemData = AVAILABLE_ITEMS.find(i => i.id === id);
    const existing = inventory.find(i => i.id === id);
    const totalQty = inventory.reduce((sum, i) => sum + i.qty, 0);

    if (totalQty >= 5) return alert("Carry limit: 5 items!");

    if (existing) {
        existing.qty++;
    } else {
        if (inventory.length >= 3) return alert("Type limit: 3 unique items!");
        inventory.push({ ...itemData, qty: 1 });
    }
    updateInvUI();
}

function updateInvUI() {
    const display = document.getElementById('loadout-display');
    display.innerHTML = "";
    // Show 3 slots (even if empty)
    for (let i = 0; i < 3; i++) {
        const item = inventory[i];
        const slot = document.createElement('div');
        slot.className = `slot ${item ? 'filled' : ''}`;
        if (item) {
            slot.innerHTML = `${item.icon}<div class="qty-badge">${item.qty}</div>`;
            slot.onclick = () => {
                item.qty--;
                if (item.qty <= 0) inventory.splice(i, 1);
                updateInvUI();
            };
        }
        display.appendChild(slot);
    }
}

// --- 5. UNIFIED INPUT SYSTEM (MOBILE & PC) ---
function initInput(target, onPaint) {
    const getP = (e) => e.touches ? {x: e.touches[0].clientX, y: e.touches[0].clientY} : {x: e.clientX, y: e.clientY};

    target.addEventListener('touchstart', (e) => {
        if(e.touches.length === 2) {
            touchDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        } else {
            // If we are in "Pan mode" or not the editor, drag the camera
            if(!isPencilMode || !onPaint) {
                camera.isDragging = true;
                camera.lastMouse = getP(e);
            } else {
                onPaint(e); // Draw tile
            }
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
        } else if(isPencilMode && onPaint) {
            onPaint(e);
        }
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

// --- 6. RENDERING ENGINE ---
function startGame() {
    switchScreen('game-screen');
    currentDrawCall = drawGame;
    isPencilMode = false; // Force pan mode for gameplay
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
    
    const s = 64; // Default tilesize
    const stX = -(data.cols * s) / 2;
    const stY = -(data.rows * s) / 2;

    data.grid.forEach((id, i) => {
        const x = stX + (i % data.cols) * s;
        const y = stY + Math.floor(i / data.cols) * s;
        cntx.fillStyle = TILE_DATA[id] ? TILE_DATA[id].color : '#000';
        cntx.fillRect(x, y, s, s);
        
        if(showGrid) {
            cntx.strokeStyle = "rgba(255,255,255,0.05)";
            cntx.lineWidth = 1/camera.zoom;
            cntx.strokeRect(x, y, s, s);
        }
    });
    cntx.restore();
}

window.onresize = () => { if(currentDrawCall) currentDrawCall(); };
