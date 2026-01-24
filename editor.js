const edCanvas = document.getElementById('editorCanvas');
const edCtx = edCanvas.getContext('2d');
let selectedTile = 0;
let editorMap = { name: "", story: "", condition: "reach_exit", rows: 12, cols: 12, grid: [] };

function openEditor() {
    switchScreen('editor-screen');
    currentDrawCall = renderEditor;
    isPencilMode = true;
    initPalette();
    resetEditorGrid();
    initInput(edCanvas, paint);
    renderEditor();
}

function initPalette() {
    const pal = document.getElementById('palette');
    pal.innerHTML = Object.entries(TILE_DATA).map(([id, d]) => `
        <div class="pal-item" id="pal-${id}" onclick="selectPalette(${id})" style="background:${d.color}"></div>
    `).join('');
    selectPalette(0);
}

function selectPalette(id) {
    selectedTile = id;
    document.querySelectorAll('.pal-item').forEach(i => i.classList.remove('active'));
    document.getElementById(`pal-${id}`).classList.add('active');
    // Update the dropdown to match tile type
    document.getElementById('tile-type-dropdown').value = TILE_DATA[id].type;
}

function updateTileProperty() {
    // This allows changing the behavior of the currently selected palette tile
    const newType = document.getElementById('tile-type-dropdown').value;
    TILE_DATA[selectedTile].type = newType;
}

function resetEditorGrid() {
    editorMap.cols = 15; editorMap.rows = 15;
    editorMap.grid = new Array(editorMap.cols * editorMap.rows).fill(0);
}

function toggleSidebar() {
    document.getElementById('editor-sidebar').classList.toggle('collapsed');
}

function togglePencil() {
    isPencilMode = !isPencilMode;
    document.getElementById('pencil-btn').innerText = isPencilMode ? "✏️ PAINTING" : "🖐️ PANNING";
}

function toggleGrid() { showGrid = !showGrid; renderEditor(); }

function paint(e) {
    if (!isPencilMode) return;
    const rect = edCanvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    const mx = (p.clientX - rect.left - edCanvas.width/2)/camera.zoom - camera.x;
    const my = (p.clientY - rect.top - edCanvas.height/2)/camera.zoom - camera.y;
    const s = 64, stX = -(editorMap.cols*s)/2, stY = -(editorMap.rows*s)/2;
    const col = Math.floor((mx - stX)/s), row = Math.floor((my - stY)/s);
    if(col >= 0 && col < editorMap.cols && row >= 0 && row < editorMap.rows) {
        editorMap.grid[row * editorMap.cols + col] = selectedTile;
        renderEditor();
    }
}

function renderEditor() {
    if (document.getElementById('editor-screen').classList.contains('hidden')) return;
    edCanvas.width = edCanvas.parentElement.clientWidth;
    edCanvas.height = edCanvas.parentElement.clientHeight;
    renderGrid(edCtx, edCanvas, editorMap);
}

function exportMap() {
    editorMap.name = document.getElementById('ed-name').value;
    editorMap.story = document.getElementById('ed-story').value;
    editorMap.condition = document.getElementById('ed-condition').value;
    // Bundle Tile Data properties too
    const fullData = { mission: editorMap, tile_definitions: TILE_DATA };
    
    document.getElementById('export-area').value = JSON.stringify(fullData, null, 2);
    document.getElementById('export-modal').classList.remove('hidden');
}

function copyToClipboard() {
    const area = document.getElementById('export-area');
    area.select();
    document.execCommand('copy');
    alert("Map JSON copied to clipboard!");
}

function closeExport() { document.getElementById('export-modal').classList.add('hidden'); }

window.onresize = () => { if(currentDrawCall) currentDrawCall(); };
