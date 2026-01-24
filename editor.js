/**
 * EDITOR.JS - MISSION ARCHITECT
 * Handles categorized tile placement and mission metadata.
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
    
    // Fill grid with default floor if empty
    if (editorMap.grid.length === 0) {
        resetEditorGrid();
    }
    
    initPalette();
    initInput(edCanvas, paint);
    renderEditor();
}

/**
 * 2. PALETTE & CATEGORIES
 */
function initPalette() {
    filterPalette(); // Default load
}

function filterPalette() {
    const pal = document.getElementById('palette');
    const cat = document.getElementById('palette-cat-select').value;
    
    pal.innerHTML = ""; // Clear current view
    
    // Loop through the registry we defined in game.js
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
    
    // Update UI highlights
    document.querySelectorAll('.pal-item').forEach(i => i.classList.remove('active'));
    const activeElem = document.getElementById(`pal-${id}`);
    if(activeElem) activeElem.classList.add('active');
    
    // Update name display
    document.getElementById('selected-tile-name').innerText = label;
}

/**
 * 3. PAINTING LOGIC
 */
function paint(e) {
    if (!isPencilMode) return;

    const rect = edCanvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;

    // Inverse Camera Math (Corrects for Zoom and Pan)
    const mx = (p.clientX - rect.left - edCanvas.width/2) / camera.zoom - camera.x;
    const my = (p.clientY - rect.top - edCanvas.height/2) / camera.zoom - camera.y;

    const s = 64; // Tilesize
    const stX = -(editorMap.cols * s) / 2;
    const stY = -(editorMap.rows * s) / 2;

    const col = Math.floor((mx - stX) / s);
    const row = Math.floor((my - stY) / s);

    if(col >= 0 && col < editorMap.cols && row >= 0 && row < editorMap.rows) {
        const index = row * editorMap.cols + col;

        // LOGIC: Ensure only one Player Start exists on the map
        if (selectedTile === 100) {
            editorMap.grid = editorMap.grid.map(id => id === 100 ? 0 : id);
        }

        editorMap.grid[index] = selectedTile;
        renderEditor();
    }
}

/**
 * 4. UI CONTROLS
 */
function toggleSidebar() {
    const sidebar = document.getElementById('editor-sidebar');
    sidebar.classList.toggle('collapsed');
    // Re-render after CSS transition
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

/**
 * 5. RENDERING
 */
function renderEditor() {
    if (document.getElementById('editor-screen').classList.contains('hidden')) return;

    const viewport = document.getElementById('editor-viewport');
    edCanvas.width = viewport.clientWidth;
    edCanvas.height = viewport.clientHeight;

    // Use shared renderer from game.js
    renderGrid(edCtx, edCanvas, editorMap);
}

/**
 * 6. EXPORTING
 */
function exportMap() {
    editorMap.name = document.getElementById('ed-name').value;
    editorMap.story = document.getElementById('ed-story').value;
    editorMap.condition = document.getElementById('ed-condition').value;

    const package = {
        map: editorMap,
        registry_snapshot: TILE_REGISTRY,
        timestamp: new Date().getTime()
    };

    document.getElementById('export-area').value = JSON.stringify(package, null, 2);
    document.getElementById('export-modal').classList.remove('hidden');
}

function copyToClipboard() {
    const area = document.getElementById('export-area');
    area.select();
    navigator.clipboard.writeText(area.value).then(() => {
        alert("JSON Data Copied! Save this to a file.");
    });
}

function closeExport() {
    document.getElementById('export-modal').classList.add('hidden');
}

// Global Resize Listener
window.addEventListener('resize', () => {
    if (currentDrawCall === renderEditor) renderEditor();
});
