const edCanvas = document.getElementById('editorCanvas');
const edCtx = edCanvas.getContext('2d');
let selectedTile = 0;
let editorMap = { name: "", story: "", rules: "", rows: 12, cols: 12, tilesize: 64, grid: [] };

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
        <div onclick="selectedTile=${id}" style="background:${d.color}; width:100%; aspect-ratio:1; border:1px solid #555; cursor:pointer;"></div>
    `).join('');
}

function resetEditorGrid() {
    editorMap.cols = parseInt(document.getElementById('ed-cols').value) || 10;
    editorMap.rows = parseInt(document.getElementById('ed-rows').value) || 10;
    editorMap.grid = new Array(editorMap.cols * editorMap.rows).fill(0);
    renderEditor();
}

function togglePencil() {
    isPencilMode = !isPencilMode;
    const b = document.getElementById('toggle-pencil');
    b.innerText = isPencilMode ? "✏️ PAINT" : "🖐️ PAN";
    b.style.background = isPencilMode ? "#007bff" : "#444";
}

function toggleGrid() { showGrid = !showGrid; renderEditor(); }

function paint(e) {
    if (!isPencilMode) return;
    const rect = edCanvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    const mx = (p.clientX - rect.left - edCanvas.width/2)/camera.zoom - camera.x;
    const my = (p.clientY - rect.top - edCanvas.height/2)/camera.zoom - camera.y;
    const s = editorMap.tilesize, stX = -(editorMap.cols*s)/2, stY = -(editorMap.rows*s)/2;
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
    editorMap.rules = document.getElementById('ed-rules').value;
    document.getElementById('export-area').value = JSON.stringify(editorMap, null, 2);
    document.getElementById('export-modal').classList.remove('hidden');
}

window.onresize = () => { if(currentDrawCall) currentDrawCall(); };
