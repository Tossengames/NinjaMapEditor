const TILE_DATA = {
    0: { color: '#333', type: 'walkable', label: 'Floor' },
    20: { color: '#000', type: 'blocked', label: 'Wall' },
    50: { color: '#1a3300', type: 'cover', label: 'Bush' },
    70: { color: '#ff00ff', type: 'steal_scroll', label: 'Scroll' },
    99: { color: '#ffcc00', type: 'reach_exit', label: 'Exit' },
    100: { color: '#00ff00', type: 'walkable', label: 'Player' },
    200: { color: '#ff0000', type: 'blocked', label: 'Enemy' }
};

let camera = { x: 0, y: 0, zoom: 1, isDragging: false, lastMouse: { x: 0, y: 0 } };
let touchDist = 0;
let isPencilMode = true;
let showGrid = true;
let currentDrawCall = null;

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function showMenu() { switchScreen('menu-screen'); }

function initInput(target, onPaint) {
    const getP = (e) => e.touches ? {x: e.touches[0].clientX, y: e.touches[0].clientY} : {x: e.clientX, y: e.clientY};

    target.addEventListener('touchstart', (e) => {
        if(e.touches.length === 2) {
            touchDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        } else {
            if(!isPencilMode || !onPaint) { camera.isDragging = true; camera.lastMouse = getP(e); }
            else { onPaint(e); }
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

    // Mouse Controls
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
}

function renderGrid(cntx, canv, data) {
    cntx.clearRect(0,0,canv.width, canv.height);
    cntx.save();
    cntx.translate(canv.width/2, canv.height/2);
    cntx.scale(camera.zoom, camera.zoom);
    cntx.translate(camera.x, camera.y);
    const s = 64, stX = -(data.cols*s)/2, stY = -(data.rows*s)/2;
    data.grid.forEach((id, i) => {
        const x = stX + (i % data.cols) * s, y = stY + Math.floor(i / data.cols) * s;
        cntx.fillStyle = TILE_DATA[id].color;
        cntx.fillRect(x,y,s,s);
        if(showGrid) {
            cntx.strokeStyle = "rgba(255,255,255,0.1)";
            cntx.lineWidth = 1/camera.zoom;
            cntx.strokeRect(x,y,s,s);
        }
    });
    cntx.restore();
}
