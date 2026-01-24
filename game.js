/**
 * GAME.JS - FIXED ENGINE
 */
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

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let currentMapData = null;
let inventory = [];
let camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
let touchDist = 0;
let isPencilMode = false;
let currentDrawCall = null;
let player = { x: 0, y: 0, targetX: 0, targetY: 0, isMoving: false, speed: 0.15 };

// --- NAVIGATION ---
function switchScreen(id) {
    document.querySelectorAll('.screen, #game-screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
    camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
}

function showMenu() { switchScreen('menu-screen'); currentDrawCall = null; }

async function loadMission(file) {
    try {
        const res = await fetch(file);
        const data = await res.json();
        currentMapData = data.map || data;
        
        // Find Spawn
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
    } catch(e) { alert("Mission file error!"); }
}

function startGame() {
    switchScreen('game-screen');
    currentDrawCall = gameLoop;
    initInput(canvas, handleGameTap);
    requestAnimationFrame(gameLoop);
}

// --- SHARED RENDERER ---
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
    });
    cntx.restore();
}

// --- INPUT (ZOOM FIXED) ---
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

function gameLoop() {
    if(currentDrawCall !== gameLoop) return;
    if(player.isMoving) {
        player.x += (player.targetX - player.x) * player.speed;
        player.y += (player.targetY - player.y) * player.speed;
    }
    draw();
    requestAnimationFrame(gameLoop);
}

function draw() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderGrid(ctx, canvas, currentMapData);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(camera.x, camera.y);
    ctx.beginPath(); ctx.arc(player.x, player.y, 20, 0, Math.PI*2);
    ctx.fillStyle = "#00ff00"; ctx.fill(); ctx.restore();
}

function handleGameTap(e) {
    const rect = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    const mx = (p.clientX - rect.left - canvas.width/2)/camera.zoom - camera.x;
    const my = (p.clientY - rect.top - canvas.height/2)/camera.zoom - camera.y;
    const s = 64, stX = -(currentMapData.cols * s)/2, stY = -(currentMapData.rows * s)/2;
    const tx = Math.floor((mx - stX)/s), ty = Math.floor((my - stY)/s);
    if(tx >=0 && tx < currentMapData.cols && ty >= 0 && ty < currentMapData.rows) {
        const tid = currentMapData.grid[ty * currentMapData.cols + tx];
        if(TILE_DATA[tid].type !== 'blocked') {
            player.targetX = stX + (tx * s) + s/2;
            player.targetY = stY + (ty * s) + s/2;
            player.isMoving = true;
        }
    }
}
