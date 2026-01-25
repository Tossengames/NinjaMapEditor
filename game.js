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
    0: { color: '#444' }, 20: { color: '#111' }, 50: { color: '#1a3300' },
    70: { color: '#ff00ff' }, 99: { color: '#ffcc00' }, 100: { color: '#00ff00' }, 200: { color: '#ff0000' }
};

let currentMapData = null;
let inventory = []; // [{id, name, icon, qty}]
let camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
let touchDist = 0;

// --- NAVIGATION ---
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
    document.getElementById('info-name').innerText = currentMapData.name;
    document.getElementById('info-story').innerText = currentMapData.story;
    document.getElementById('info-rules').innerText = currentMapData.rules;
    switchScreen('info-screen');
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
    switchScreen('game-screen');
    updateToolbar();
    camera.x = 0; camera.y = 0; camera.zoom = 1;
    draw();
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
        alert(`Used ${item.name}!`);
        updateToolbar();
    }
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
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(camera.x, camera.y);

    const map = currentMapData;
    const size = map.tilesize;
    const startX = -(map.cols * size) / 2;
    const startY = -(map.rows * size) / 2;

    map.grid.forEach((id, i) => {
        const x = startX + (i % map.cols) * size;
        const y = startY + Math.floor(i / map.cols) * size;
        ctx.fillStyle = TILE_DATA[id]?.color || '#000';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.strokeRect(x, y, size, size);
    });
    ctx.restore();
}

function gameAction(a) { alert("Action: " + a); }
function togglePause(p) { document.getElementById('pause-screen').classList.toggle('hidden', !p); }
window.onload = () => { initInput(); window.onresize = draw; };
