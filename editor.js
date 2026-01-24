/**
 * EDITOR.JS
 * Handles Map Creation, Palette Management, and JSON Exporting.
 */

const edCanvas = document.getElementById('editorCanvas');
const edCtx = edCanvas.getContext('2d');

let selectedTile = 0;
let editorMap = { 
    name: "New Mission", 
    story: "", 
    condition: "reach_exit", 
    rows: 15, 
    cols: 15, 
    grid: [] 
};

/**
 * INITIALIZATION
 */
function openEditor() {
    switchScreen('editor-screen');
    
    // Tell the engine what to draw
    currentDrawCall = renderEditor;
    isPencilMode = true; // Default to drawing
    
    initPalette();
    resetEditorGrid();
    
    // Initialize the unified input system from game.js
    initInput(edCanvas, paint);
    
    renderEditor();
}

/**
 * UI & PALETTE
 */
function initPalette() {
    const pal = document.getElementById('palette');
    pal.innerHTML = Object.entries(TILE_DATA).map(([id, d]) => `
        <div class="pal-item" id="pal-${id}" 
             onclick="selectPalette(${id})" 
             style="background:${d.color}" 
             title="${d.label}">
        </div>
    `).join('');
    selectPalette(0); // Default to Floor
}

function selectPalette(id) {
    selectedTile = id;
    // UI Feedback
    document.querySelectorAll('.pal-item').forEach(i => i.classList.remove('active'));
    const activeElem = document.getElementById(`pal-${id}`);
    if(activeElem) activeElem.classList.add('active');
    
    // Update the Tile Property dropdown to match this tile's current definition
    document.getElementById('tile-type-dropdown').value = TILE_DATA[id].type;
}

function updateTileProperty() {
    // Allows the user to change the behavior of the selected tile type globally
    const newType = document.getElementById('tile-type-dropdown').value;
    TILE_DATA[selectedTile].type = newType;
}

function resetEditorGrid() {
    // Fill the grid with the first item in the palette (usually Floor)
    editorMap.grid = new Array(editorMap.cols * editorMap.rows).fill(0);
}

/**
 * EDITOR CONTROLS
 */
function toggleSidebar() {
    const sidebar = document.getElementById('editor-sidebar');
    sidebar.classList.toggle('collapsed');
    
    // Re-render after transition to fix canvas size
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

/**
 * PAINTING LOGIC
 */
function paint(e) {
    if (!isPencilMode) return;

    const rect = edCanvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;

    // Use Inverse Camera Math to find the specific tile under the mouse/finger
    const mx = (p.clientX - rect.left - edCanvas.width/2) / camera.zoom - camera.x;
    const my = (p.clientY - rect.top - edCanvas.height/2) / camera.zoom - camera.y;

    const s = 64; // Grid size
    const stX = -(editorMap.cols * s) / 2;
    const stY = -(editorMap.rows * s) / 2;

    const col = Math.floor((mx - stX) / s);
    const row = Math.floor((my - stY) / s);

    // If within bounds, set the tile ID
    if(col >= 0 && col < editorMap.cols && row >= 0 && row < editorMap.rows) {
        editorMap.grid[row * editorMap.cols + col] = selectedTile;
        renderEditor();
    }
}

/**
 * RENDERING
 */
function renderEditor() {
    if (document.getElementById('editor-screen').classList.contains('hidden')) return;

    // Resize canvas to fill the remaining viewport space
    edCanvas.width = edCanvas.parentElement.clientWidth;
    edCanvas.height = edCanvas.parentElement.clientHeight;

    // Call the shared rendering logic from game.js
    renderGrid(edCtx, edCanvas, editorMap);
}

/**
 * EXPORT SYSTEM
 */
function exportMap() {
    // Gather all metadata from the UI
    editorMap.name = document.getElementById('ed-name').value || "New Mission";
    editorMap.story = document.getElementById('ed-story').value || "No briefing provided.";
    editorMap.condition = document.getElementById('ed-condition').value;

    // Package the map and the tile rules together
    const fullMissionPackage = {
        map: editorMap,
        tileDefinitions: TILE_DATA,
        exportedAt: new Date().toISOString()
    };

    const jsonOutput = JSON.stringify(fullMissionPackage, null, 2);
    
    // Show the modal with the code
    document.getElementById('export-area').value = jsonOutput;
    document.getElementById('export-modal').classList.remove('hidden');
}

function copyToClipboard() {
    const area = document.getElementById('export-area');
    area.select();
    
    // Modern Clipboard API
    navigator.clipboard.writeText(area.value).then(() => {
        alert("Mission JSON copied to clipboard! Save it to a file to play.");
    }).catch(err => {
        console.error('Failed to copy: ', err);
        // Fallback for older browsers
        document.execCommand('copy');
        alert("Copied!");
    });
}

function closeExport() {
    document.getElementById('export-modal').classList.add('hidden');
}

// Ensure the editor stays responsive to screen rotation/resizing
window.addEventListener('resize', () => {
    if(currentDrawCall === renderEditor) renderEditor();
});
