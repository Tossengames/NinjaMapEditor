const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- DATA ---
const levelFiles = ["level1.json"]; 
const AVAILABLE_ITEMS = [
    { id: 'rice', name: 'Poison Rice', icon: '🍙' },
    { id: 'bomb', name: 'Smoke Bomb', icon: '💨' },
    { id: 'gas', name: 'Sleep Gas', icon: '🧪' },
    { id: 'potion', name: 'Health Pot', icon: '❤️' },
    { id: 'trap', name: 'Caltrops', icon: '🪤' }
];

const TILE_DATA = {
    0: { color: '#444', name: 'floor' },
    20: { color: '#111', name: 'wall' },
    50: { color: '#1a3300', name: 'bush' },
    70: { color: '#ff00ff', name: 'scroll' },
    99: { color: '#ffcc00', name: 'exit' },
    100: { color: '#00ff00', name: 'player' },
    200: { color: '#ff0000', name: 'enemy' }
};

// --- STATE ---
let currentMapData = null;
let selectedItems = [];
let camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
let touchDist = 0;

// --- 1. MENU LOGIC ---
function showMissionList() {
    document.getElementById('level-list-container').classList.remove('hidden');
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

// --- 2. ITEM SELECTION ---
function showItemSelection() {
    switchScreen('item-screen');
    selectedItems = [];
    const grid = document.getElementById('item-grid');
    grid.innerHTML = AVAILABLE_ITEMS.map(item => `
        <div class="item-card" id="card-${item.id}" onclick="toggleItem('${item.id}')">
            <div style="font-size:24px">${item.icon}</div>
            <div>${item.name}</div>
        </div>
    `).join('');
    updateItemUI();
}

function toggleItem(id) {
    const item = AVAILABLE_ITEMS.find(i => i.id === id);
    const index = selectedItems.indexOf(item);
    
    if (index > -1) {
        selectedItems.splice(index, 1);
    } else if (selectedItems.length < 3) {
        selectedItems.push(item);
    }
    updateItemUI();
}

function updateItemUI() {
    AVAILABLE_ITEMS.forEach(item => {
        document.getElementById(`card-${item.id}`).classList.toggle('active', selectedItems.includes(item));
    });
    document.getElementById('selection-count').innerText = `${selectedItems.length}/3`;
}

// --- 3. CAMERA & MOBILE INPUT ---
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
            camera.zoom = Math.min(Math.max(0.4, camera.zoom * (curDist / touchDist)), 3);
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
    window.addEventListener('touchmove', (e) => { e.preventDefault(); move(e); }, {passive: false});
    window.addEventListener('mouseup', () => camera.isDragging = false);
    window.addEventListener('touchend', () => camera.isDragging = false);
    
    window.addEventListener('wheel', e => {
        camera.zoom = Math.min(Math.max(0.4, camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1)), 3);
        draw();
    }, {passive: false});
}

// --- 4. GAME ENGINE ---
function startGame() {
    switchScreen('game-screen');
    const container = document.getElementById('dynamic-items');
    container.innerHTML = selectedItems.map(item => `
        <div class="tool-btn special" onclick="gameAction('${item.name}')">${item.icon}<br>x5</div>
    `).join('');
    
    camera.x = 0; camera.y = 0; camera.zoom = 1;
    draw();
}

function draw() {
    if (!currentMapData) return;
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

    map.grid.forEach((id, i) => {
        const x = startX + (i % map.cols) * size;
        const y = startY + Math.floor(i / map.cols) * size;
        ctx.fillStyle = TILE_DATA[id]?.color || '#000';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.strokeRect(x, y, size, size);
    });

    ctx.restore();
}

function gameAction(act) { alert("Performing: " + act); }
function togglePause(p) { document.getElementById('pause-screen').classList.toggle('hidden', !p); }
function switchScreen(id) {
    document.querySelectorAll('.screen, #game-screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}
function showMenu() { switchScreen('menu-screen'); }

window.onload = () => { initInput(); window.onresize = draw; };
