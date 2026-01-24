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
    0: { color: '#444', name: 'Floor' },
    20: { color: '#111', name: 'Wall' },
    50: { color: '#1a3300', name: 'Bush' },
    70: { color: '#ff00ff', name: 'Scroll' },
    99: { color: '#ffcc00', name: 'Exit' },
    100: { color: '#00ff00', name: 'Player' },
    200: { color: '#ff0000', name: 'Enemy' }
};

let currentMapData = null;
let inventory = [];
let camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };

function switchScreen(id) {
    document.querySelectorAll('.screen, #game-screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function showMenu() { switchScreen('menu-screen'); }

function showMissionList() {
    switchScreen('mission-screen');
    const list = document.getElementById('level-list');
    list.innerHTML = levelFiles.map(f => `<div class="list-item" onclick="loadMission('${f}')">${f.toUpperCase()}</div>`).join('');
}

async function loadMission(file) {
    const res = await fetch(file);
    currentMapData = await res.json();
    switchScreen('item-screen');
    showItemSelection();
}

function showItemSelection() {
    const grid = document.getElementById('item-grid');
    grid.innerHTML = AVAILABLE_ITEMS.map(item => `
        <div class="item-card" id="card-${item.id}" onclick="addItem('${item.id}')">${item.icon}<br>${item.name}</div>
    `).join('');
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

function startGame() {
    switchScreen('game-screen');
    initGameInput();
    draw();
}

function draw() {
    if (!currentMapData || document.getElementById('game-screen').classList.contains('hidden')) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(camera.x, camera.y);
    
    const m = currentMapData;
    const startX = -(m.cols * m.tilesize)/2;
    const startY = -(m.rows * m.tilesize)/2;

    m.grid.forEach((id, i) => {
        ctx.fillStyle = TILE_DATA[id]?.color || '#000';
        ctx.fillRect(startX + (i % m.cols) * m.tilesize, startY + Math.floor(i / m.cols) * m.tilesize, m.tilesize, m.tilesize);
    });
    ctx.restore();
}

function initGameInput() {
    canvas.onmousedown = (e) => { camera.isDragging = true; camera.lastMouse = { x: e.clientX, y: e.clientY }; };
    window.onmousemove = (e) => {
        if (!camera.isDragging) return;
        camera.x += (e.clientX - camera.lastMouse.x) / camera.zoom;
        camera.y += (e.clientY - camera.lastMouse.y) / camera.zoom;
        camera.lastMouse = { x: e.clientX, y: e.clientY };
        draw();
    };
    window.onmouseup = () => camera.isDragging = false;
}

window.onresize = draw;
