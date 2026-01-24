const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- TILE DEFINITIONS ---
const TILE_DATA = {
    // Floors (0-19)
    0: { name: 'floor1', color: '#444', walkable: true },
    5: { name: 'snow1', color: '#fff', walkable: true },
    // Walls (20-49)
    20: { name: 'wall1', color: '#111', walkable: false },
    30: { name: 'water1', color: '#0044ff', walkable: false },
    // Hiding (50-69)
    50: { name: 'bush1', color: '#1a3300', walkable: true, hiding: true },
    // Collectibles (70-89)
    70: { name: 'scroll', color: '#ff00ff', walkable: true, item: 'scroll' },
    // Goal & Units (90+)
    99: { name: 'exit', color: '#ffcc00', walkable: true },
    100: { name: 'player', color: '#00ff00', unit: true },
    200: { name: 'enemy', color: '#ff0000', unit: true }
};

// --- STATE ---
let currentMapData = null;
const levelFiles = ["level1.json"]; // Add your JSON filenames here
const sprites = {};
const camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };

// --- 1. ASSET LOADING ---
async function preloadAssets() {
    const loader = [];
    for (let id in TILE_DATA) {
        const tile = TILE_DATA[id];
        loader.push(new Promise(resolve => {
            const img = new Image();
            img.src = `sprites/${tile.name}.png`;
            img.onload = () => { sprites[id] = img; resolve(); };
            img.onerror = () => { sprites[id] = null; resolve(); }; // Fallback to color
        }));
    }
    await Promise.all(loader);
}

// --- 2. CAMERA & INPUT ---
function initCamera() {
    const handleStart = (x, y) => { camera.isDragging = true; camera.lastMouse = { x, y }; };
    const handleMove = (x, y) => {
        if (!camera.isDragging) return;
        camera.x += (x - camera.lastMouse.x) / camera.zoom;
        camera.y += (y - camera.lastMouse.y) / camera.zoom;
        camera.lastMouse = { x, y };
        draw();
    };

    canvas.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => camera.isDragging = false);

    canvas.addEventListener('touchstart', e => handleStart(e.touches[0].clientX, e.touches[0].clientY));
    canvas.addEventListener('touchmove', e => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    canvas.addEventListener('touchend', () => camera.isDragging = false);

    window.addEventListener('wheel', e => {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        camera.zoom = Math.min(Math.max(0.3, camera.zoom * delta), 3);
        draw();
    }, { passive: false });
}

// --- 3. UI & FLOW ---
function toggleLevelList() {
    const container = document.getElementById('level-list-container');
    container.classList.toggle('hidden');
    const list = document.getElementById('level-list');
    list.innerHTML = "";
    levelFiles.forEach(file => {
        const div = document.createElement('div');
        div.className = 'level-item';
        div.innerText = file.toUpperCase();
        div.onclick = () => loadLevelInfo(file);
        list.appendChild(div);
    });
}

async function loadLevelInfo(file) {
    const res = await fetch(file);
    currentMapData = await res.json();
    document.getElementById('info-name').innerText = currentMapData.name;
    document.getElementById('info-story').innerText = currentMapData.story;
    document.getElementById('info-rules').innerText = currentMapData.rules;
    document.getElementById('ui-mission-type').innerText = currentMapData.missionType;
    switchScreen('info-screen');
}

function startGame() {
    switchScreen('game-screen');
    camera.x = 0; camera.y = 0; camera.zoom = 1;
    draw();
}

function togglePause(paused) {
    document.getElementById('pause-overlay').classList.toggle('hidden', !paused);
    document.getElementById('pause-objectives').innerText = currentMapData.rules;
}

function draw() {
    if (!currentMapData) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Camera Transform
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(camera.x, camera.y);

    const map = currentMapData;
    const offset = { x: -(map.cols * map.tilesize) / 2, y: -(map.rows * map.tilesize) / 2 };

    map.grid.forEach((id, i) => {
        const x = offset.x + (i % map.cols) * map.tilesize;
        const y = offset.y + Math.floor(i / map.cols) * map.tilesize;
        
        const tile = TILE_DATA[id];
        if (sprites[id]) {
            ctx.drawImage(sprites[id], x, y, map.tilesize, map.tilesize);
        } else if (tile) {
            ctx.fillStyle = tile.color;
            ctx.fillRect(x, y, map.tilesize, map.tilesize);
        }
    });

    ctx.restore();
}

function switchScreen(id) {
    document.querySelectorAll('.screen, #game-screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function showMenu() { switchScreen('menu-screen'); }

window.onload = () => {
    preloadAssets();
    initCamera();
    window.addEventListener('resize', draw);
};
