/**
 * EDITOR.JS - THE ARCHITECT PRO
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
 * 1. INITIALIZATION & SCREEN ENTRY
 */
function openEditor() {
    switchScreen('editor-screen');
    currentDrawCall = renderEditor;
    isPencilMode = true;
    
    // Default grid setup
    if (editorMap.grid.length === 0) {
        resetEditorGrid();
    }
    
    initPalette();
    // Pass 'paint' as the action for the unified input system
    initInput(edCanvas, paint);
    renderEditor();
}

/**
 * 2. POWER TOOLS (RESIZE, FILL, BORDER)
 */
function resizeMap() {
    const newCols = parseInt(document.getElementById('ed-width').value) || 15;
    const newRows = parseInt(document.getElementById('ed-height').value) || 15;
    
    const newGrid = new Array(newCols * newRows).fill(0);

    // Copy old tiles into new grid (Top-Left Anchored)
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
    const wallId = 20; // wall_brick ID
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
 * 3. PALETTE LOGIC
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
 * 4. PAINTING & INPUT
 */
function paint(e) {
    if (!isPencilMode) return;

    const rect = edCanvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;

    // Apply Inverse Camera Transform to find the world-space coordinate
    const mx = (p.clientX - rect.left - edCanvas.width/2) / camera.zoom - camera.x;
    const my = (p.clientY - rect.top - edCanvas.height/2) / camera.zoom - camera.y;

    const s = 64; 
    const stX = -(editorMap.cols * s) / 2;
    const stY = -(editorMap.rows * s) / 2;

    const col = Math.floor((mx - stX) / s);
    const row = Math.floor((my - stY) / s);

    if(col >= 0 && col < editorMap.cols && row >= 0 && row < editorMap.rows) {
        const index = row * editorMap.cols + col;

        // Constraint: Only one Player Spawn allowed
        if (selectedTile === 100) {
            editorMap.grid = editorMap.grid.map(id => id === 100 ? 0 : id);
        }

        editorMap.grid[index] = selectedTile;
        renderEditor(); // Immediate visual feedback
    }
}

/**
 * 5. UI CONTROLS & RENDERING
 */
function toggleSidebar() {
    document.getElementById('editor-sidebar').classList.toggle('collapsed');
    // Brief delay to allow CSS transition to finish before resizing canvas
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
    
    const vp = document.getElementById('viewport-container');
    edCanvas.width = vp.clientWidth;
    edCanvas.height = vp.clientHeight;

    // Call the unified renderer from game.js
    renderGrid(edCtx, edCanvas, editorMap);
}

/**
 * 6. EXPORT / DATA HANDLING
 */
function exportMap() {
    // Collect metadata from inputs
    editorMap.name = document.getElementById('ed-name').value || "Unnamed Mission";
    editorMap.story = document.getElementById('ed-story').value || "No briefing.";
    editorMap.condition = document.getElementById('ed-condition').value;

    const exportData = {
        map: editorMap,
        version: "2.1",
        exportedAt: new Date().toISOString()
    };

    document.getElementById('export-area').value = JSON.stringify(exportData, null, 2);
    document.getElementById('export-modal').classList.remove('hidden');
}

function copyToClipboard() {
    const area = document.getElementById('export-area');
    area.select();
    
    // Modern copy API with fallback
    if (navigator.clipboard) {
        navigator.clipboard.writeText(area.value).then(() => {
            alert("Mission data copied to clipboard!");
        });
    } else {
        document.execCommand('copy');
        alert("Mission data copied!");
    }
}

function closeExport() {
    document.getElementById('export-modal').classList.add('hidden');
}

// Ensure the editor stays responsive to screen changes
window.addEventListener('resize', () => {
    if (currentDrawCall === renderEditor) renderEditor();
});
