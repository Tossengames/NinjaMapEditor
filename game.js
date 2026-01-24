const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const levelFiles = ["level1.json"]; 
const AVAILABLE_ITEMS = [
    { id: 'rice', name: 'Poison Rice', icon: '🍙' },
    { id: 'bomb', name: 'Smoke Bomb', icon: '💨' },
    { id: 'gas', name: 'Sleep Gas', icon: '🧪' },
    { id: 'potion', name: 'Health Pot', icon: '❤️' },
    { id: 'trap', name: 'Caltrops', icon: '🪤' }
];

const TILE_DATA = {
    0: { color: '#333' }, 20: { color: '#000' }, 50: { color: '#1a3300' },
    70: { color: '#ff00ff' }, 99: { color: '#ffcc00' }, 100: { color: '#00ff00' }, 200: { color: '#ff0000' }
};

let currentMapData = null;
let inventory = [];
let camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
let touchDist = 0;
let isPencilMode = true;
let showGrid = true;
let currentDrawCall = null;

function switchScreen(id) {
    document.querySelectorAll('.screen, #game-screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
}

function showMenu() { switchScreen('menu-screen'); }

function showMissionList() {
    switchScreen('mission-screen');
    const list = document.getElementById('level-list');
    list.innerHTML = levelFiles.map(f => `<div class="list-item" onclick="loadMission('${f}')">${f.toUpperCase()}</div>`).join('');
}

async function loadMission(file) {
    try {
        const res = await fetch(file);
        currentMapData = await res.json();
        switchScreen('item-screen');
        showItemSelection();
    } catch(e) { alert("File not found. Use Editor to create and save a JSON first!"); }
}

function showItemSelection() {
    const grid = document.getElementById('item-grid');
    grid.innerHTML = AVAILABLE_ITEMS.map(item => `<div class="item-card" onclick="addItem('${item.id}')">${item.icon}<br>${item.name}</div>`).join('');
    updateInvUI();
}

function addItem(id) {
    const itemData = AVAILABLE_ITEMS.find(i => i.id === id);
    const existing = inventory.find(i => i.id === id);
    const total = inventory.reduce((sum, i) => sum + i.qty, 0);
    if (total >= 5) return;
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
        slot.innerHTML = item ? `${item.icon}<div class="qty-badge">${item.qty}</div>` : "";
        if(item) slot.onclick = () => { item.qty--; if(item.qty<=0) inventory.splice(i,1); updateInvUI(); };
        display.appendChild(slot);
    }
}

function initInput(target, onPaint) {
    const getP = (e) => e.touches ? {x: e.touches[0].clientX, y: e.touches[0].clientY} : {x: e.clientX, y: e.clientY};
    
    target.addEventListener('touchstart', (e) => {
        if(e.touches.length === 2) {
            touchDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        } else {
            if(!isPencilMode || !onPaint) { camera.isDragging = true; camera.lastMouse = getP(e); }
            else onPaint(e);
        }
    }, {passive: false});

    target.addEventListener('touchmove', (e) => {
        if(e.touches.length === 2) {
            e.preventDefault();
            const d = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            camera.zoom = Math.min(Math.max(0.3, camera.zoom * (d/touchDist)), 4);
            touchDist = d;
            currentDrawCall();
        } else if(camera.isDragging) {
            const p = getP(e);
            camera.x += (p.x - camera.lastMouse.x)/camera.zoom; camera.y += (p.y - camera.lastMouse.y)/camera.zoom;
            camera.lastMouse = p; currentDrawCall();
        } else if(isPencilMode && onPaint) { onPaint(e); }
    }, {passive: false});

    target.onmousedown = (e) => { 
        if(e.button === 0 && isPencilMode && onPaint) onPaint(e);
        else { camera.isDragging = true; camera.lastMouse = {x:e.clientX, y:e.clientY}; }
    };
    window.onmousemove = (e) => { 
        if(!camera.isDragging) return;
        camera.x += (e.clientX - camera.lastMouse.x)/camera.zoom; camera.y += (e.clientY - camera.lastMouse.y)/camera.zoom;
        camera.lastMouse = {x:e.clientX, y:e.clientY}; currentDrawCall();
    };
    window.onmouseup = window.ontouchend = () => { camera.isDragging = false; touchDist = 0; };
    window.onwheel = (e) => { camera.zoom = Math.min(Math.max(0.3, camera.zoom * (e.deltaY>0?0.9:1.1)), 4); currentDrawCall(); };
}

function startGame() {
    switchScreen('game-screen');
    currentDrawCall = drawGame;
    isPencilMode = false;
    initInput(canvas, null);
    drawGame();
}

function drawGame() {
    if (!currentMapData) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    renderGrid(ctx, canvas, currentMapData);
}

function renderGrid(cntx, canv, data) {
    cntx.clearRect(0,0,canv.width, canv.height);
    cntx.save();
    cntx.translate(canv.width/2, canv.height/2); cntx.scale(camera.zoom, camera.zoom); cntx.translate(camera.x, camera.y);
    const s = data.tilesize, stX = -(data.cols*s)/2, stY = -(data.rows*s)/2;
    data.grid.forEach((id, i) => {
        const x = stX + (i % data.cols) * s, y = stY + Math.floor(i / data.cols) * s;
        cntx.fillStyle = TILE_DATA[id].color; cntx.fillRect(x,y,s,s);
        if(showGrid) { cntx.strokeStyle = "rgba(255,255,255,0.05)"; cntx.lineWidth = 1/camera.zoom; cntx.strokeRect(x,y,s,s); }
    });
    cntx.restore();
}
