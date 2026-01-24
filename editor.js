/**
 * EDITOR.JS - THE MISSION ARCHITECT PRO
 * Optimized for Panning, Zooming, and Structural Tools.
 */

const edCanvas = document.getElementById('editorCanvas');
const edCtx = edCanvas.getContext('2d');

let selectedTile = 0;
let editorMap = { 
    name: "New Operation", 
    story: "", 
    condition: "reach_exit", 
    rows: 15, 
    cols: 15, 
    grid: [] 
};

/**
 * 1. ENTRY POINT
 */
function openEditor() {
    switchScreen('editor-screen');
    currentDrawCall = renderEditor;
    
    // Default mode setup
    isPencilMode = true; 
    camera.zoom = 1;
    camera.x = 0;
    camera.y = 0;

    if (editorMap.grid.length === 0) resetEditorGrid();
    
    initPalette();
    // Initialize unified input with the paint action
    initInput(edCanvas, paint); 
    renderEditor();
}

/**
 * 2. PAINTING LOGIC (Coordinate Translation)
 */
function paint(e) {
    if (!isPencilMode) return;

    const rect = edCanvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;

    // Translate screen pixels to world-space grid coordinates
    const mx = (p.clientX - rect.left - edCanvas.width / 2) / camera.zoom - camera.x;
    const my = (p.clientY - rect.top - edCanvas.height / 2) / camera.zoom - camera.y;

    const s = 64; // Tilesize
    const stX = -(editorMap.cols * s) / 2;
    const stY = -(editorMap.rows * s) / 2;

    const col = Math.floor((mx - stX) / s);
    const row = Math.floor((my - stY) / s);

    if (col >= 0 && col < editorMap.cols && row >= 0 && row < editorMap.rows) {
        const index = row * editorMap.cols + col;

        // Constraint: Only one Player Start (ID 100) allowed on the map
        if (selectedTile === 100) {
            editorMap.grid = editorMap.grid.map(id => id === 100 ? 0 : id);
        }

        editorMap.grid[index] = selectedTile;
        renderEditor(); // Instant refresh
    }
}

/**
 * 3. POWER TOOLS (Structural Operations)
 */
function resizeMap() {
    const newCols = parseInt(document.getElementById('ed-width').value) || 15;
    const newRows = parseInt(document.getElementById('ed-height').value) || 15;
    
    const newGrid = new Array(newCols * newRows).fill(0);

    // Copy old tiles into the new resized grid
    for (let r = 0; r < Math.min(newRows, editorMap.rows); r++) {
        for (let c = 0; c < Math.min(newCols, editorMap.cols); r++) {
            newGrid[r * newCols + c] = editorMap.grid[r * editorMap.cols + c];
        }
    }

    editorMap.cols = newCols;
    editorMap.rows = newRows;
    editorMap.grid = newGrid;
    renderEditor();
}

function fillMap() {
    if (confirm("Fill entire map with selected tile?")) {
        editorMap.grid = editorMap.grid.fill(selectedTile);
        renderEditor();
    }
}

function autoWalls() {
    const wallId = 20; // Matches Brick Wall in Registry
    for (let r = 0; r < editorMap.rows; r++) {
        for (let c = 0; c < editorMap.cols; c++) {
            if (r === 0 || r === editorMap.rows - 1 || c === 0 || c === editorMap.cols - 1) {
                editorMap.grid[r * editorMap.cols + c] = wallId;
            }
        }
    }
    renderEditor();
}

/**
 * 4. UI HANDLERS (Panning & Display)
 */
function togglePencil() {
    isPencilMode = !isPencilMode;
    const btn = document.getElementById('pencil-btn');
    if (!btn) return;

    btn.innerText = isPencilMode ? "✏️ PAINTING" : "🖐️ PANNING";
    btn.style.background = isPencilMode ? "var(--blue)" : "#444";
    camera.isDragging = false; // Prevent accidental drifts when switching
}

function toggleSidebar() {
    document.getElementById('editor-sidebar').classList.toggle('collapsed');
    setTimeout(renderEditor, 310); // Wait for CSS transition
}

function toggleGrid() {
    showGrid = !showGrid;
    renderEditor();
}

/**
 * 5. PALETTE & RENDERING
 */
function initPalette() {
    const pal = document.getElementById('palette');
    const cat = document.getElementById('palette-cat-select').value;
    pal.innerHTML = ""; 

    Object.entries(TILE_REGISTRY).forEach(([key, d]) => {
        if (cat === "all" || d.cat === cat) {
            const item = document.createElement('div');
            item.className = "pal-item" + (selectedTile === d.id ? " active" : "");
            item.id = `pal-${d.id}`;
            item.style.background = d.color;
            item.onclick = () => selectPalette(d.id, d.label);
            pal.appendChild(item);
        }
    });
}

function selectPalette(id, label) {
    selectedTile = id;
    document.querySelectorAll('.pal-item').forEach(i => i.classList.remove('active'));
    const activeElem = document.getElementById(`pal-${id}`);
    if (activeElem) activeElem.classList.add('active');
    document.getElementById('selected-tile-name').innerText = label;
}

function resetEditorGrid() {
    editorMap.grid = new Array(editorMap.cols * editorMap.rows).fill(0);
}

function renderEditor() {
    const vp = document.getElementById('viewport-container');
    if (!vp || document.getElementById('editor-screen').classList.contains('hidden')) return;
    
    edCanvas.width = vp.clientWidth;
    edCanvas.height = vp.clientHeight;
    
    // Core render function from game.js
    renderGrid(edCtx, edCanvas, editorMap);
}

/**
 * 6. EXPORT / DATA
 */
function exportMap() {
    editorMap.name = document.getElementById('ed-name').value || "Operation X";
    editorMap.condition = document.getElementById('ed-condition').value;

    const exportBundle = {
        map: editorMap,
        registry: TILE_REGISTRY
    };

    const area = document.getElementById('export-area');
    const modal = document.getElementById('export-modal');
    
    if (area && modal) {
        area.value = JSON.stringify(exportBundle, null, 2);
        modal.classList.remove('hidden');
    }
}

function copyToClipboard() {
    const area = document.getElementById('export-area');
    area.select();
    document.execCommand('copy');
    alert("Map Data Copied!");
}

function closeExport() {
    document.getElementById('export-modal').classList.add('hidden');
}

// Global window resize logic
window.addEventListener('resize', () => {
    if (currentDrawCall === renderEditor) renderEditor();
});
