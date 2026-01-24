/**
 * EDITOR.JS - THE MISSION ARCHITECT
 * Handles map creation, logic placement, and structural tools.
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
 * 1. INITIALIZATION
 */
function openEditor() {
    switchScreen('editor-screen');
    currentDrawCall = renderEditor;
    isPencilMode = true;
    
    // Initialize a default grid if empty
    if (editorMap.grid.length === 0) {
        resetEditorGrid();
    }
    
    initPalette();
    initInput(edCanvas, paint);
    renderEditor();
}

/**
 * 2. STRUCTURAL TOOLS (Resize, Fill, Border)
 */
function resizeMap() {
    const newCols = parseInt(document.getElementById('ed-width').value) || 15;
    const newRows = parseInt(document.getElementById('ed-height').value) || 15;
    
    const newGrid = new Array(newCols * newRows).fill(0);

    // Copy existing tiles to the new grid relative to top-left
    for (let r = 0; r < Math.min(newRows, editorMap.rows); r++) {
        for (let c = 0; c < Math.min(newCols, editorMap.cols); c++) {
            newGrid[r * newCols + c] = editorMap.grid[r * editorMap.cols + c];
        }
    }

    editorMap.cols = newCols;
    editorMap.rows = newRows;
    editorMap.grid = newGrid;
    renderEditor();
}

function fillMap() {
    const tileName = TILE_DATA[selectedTile]?.label || "selected tile";
    if (confirm(`Fill the entire map with ${tileName}?`)) {
        editorMap.grid = editorMap.grid.fill(selectedTile);
        renderEditor();
    }
}

function autoWalls() {
    const wallId = 20; // Brick Wall ID from Registry
    for (let r = 0; r < editorMap.rows; r++) {
        for (let c = 0; c < editorMap.cols; c++) {
            // Check if tile is on the edge
            if (r === 0 || r === editorMap.rows - 1 || c === 0 || c === editorMap.cols - 1) {
                editorMap.grid[r * editorMap.cols + c] = wallId;
            }
        }
    }
    renderEditor();
}

/**
 * 3. PALETTE & CATEGORIES
 */
function initPalette() {
    filterPalette();
}

function filterPalette() {
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
    if(activeElem) activeElem.classList.add('active');
    document.getElementById('selected-tile-name').innerText = label;
}

/**
 * 4. PAINTING ENGINE
 */
function paint(e) {
    if (!isPencilMode) return;

    const rect = edCanvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;

    const mx = (p.clientX - rect.left - edCanvas.width/2) / camera.zoom - camera.x;
    const my = (p.clientY - rect.top - edCanvas.height/2) / camera.zoom - camera.y;

    const s = 64; 
    const stX = -(editorMap.cols * s) / 2;
    const stY = -(editorMap.rows * s) / 2;

    const col = Math.floor((mx - stX) / s);
    const row = Math.floor((my - stY) / s);

    if(col >= 0 && col < editorMap.cols && row >= 0 && row < editorMap.rows) {
        const index = row * editorMap.cols + col;

        // Unique Constraint: Only one Player Start (ID 100)
        if (selectedTile === 100) {
            editorMap.grid = editorMap.grid.map(id => id === 100 ? 0 : id);
        }

        editorMap.grid[index] = selectedTile;
        renderEditor();
    }
}

/**
 * 5. UI & RENDERING
 */
function toggleSidebar() {
    document.getElementById('editor-sidebar').classList.toggle('collapsed');
    setTimeout(renderEditor, 310);
}

function togglePencil() {
    isPencilMode = !isPencilMode;
    const btn = document.getElementById('pencil-btn');
    btn.innerText = isPencilMode ? "✏️ PAINTING" : "🖐️ PANNING";
    btn.style.background = isPencilMode ? "var(--blue)" : "#444";
}

function toggleGrid() {
    showGrid = !showGrid;
    renderEditor();
}

function resetEditorGrid() {
    editorMap.grid = new Array(editorMap.cols * editorMap.rows).fill(0);
}

function renderEditor() {
    if (document.getElementById('editor-screen').classList.contains('hidden')) return;
    const viewport = document.getElementById('viewport-container');
    edCanvas.width = viewport.clientWidth;
    edCanvas.height = viewport.clientHeight;

    // Use the core renderer from game.js
    renderGrid(edCtx, edCanvas, editorMap);
}

/**
 * 6. DATA EXPORT
 */
function exportMap() {
    editorMap.name = document.getElementById('ed-name').value || "Unnamed Mission";
    editorMap.story = document.getElementById('ed-story').value || "No briefing.";
    editorMap.condition = document.getElementById('ed-condition').value;

    const payload = {
        map: editorMap,
        ver: "2.0",
        timestamp: Date.now()
    };

    document.getElementById('export-area').value = JSON.stringify(payload, null, 2);
    document.getElementById('export-modal').classList.remove('hidden');
}

function copyToClipboard() {
    const area = document.getElementById('export-area');
    area.select();
    navigator.clipboard.writeText(area.value).then(() => alert("Mission Data Copied!"));
}

function closeExport() {
    document.getElementById('export-modal').classList.add('hidden');
}

window.addEventListener('resize', () => {
    if (currentDrawCall === renderEditor) renderEditor();
});
