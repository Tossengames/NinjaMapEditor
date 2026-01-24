const edCanvas = document.getElementById('editorCanvas');
const edCtx = edCanvas.getContext('2d');
let selectedTile = 0;
let editorMap = { name: "New Mission", story: "", rules: "", rows: 15, cols: 15, tilesize: 64, grid: [] };

function openEditor() {
    switchScreen('editor-screen');
    initPalette();
    resetEditorGrid();
    initEditorInput();
    renderEditor();
}

function initPalette() {
    const pal = document.getElementById('palette');
    pal.innerHTML = Object.entries(TILE_DATA).map(([id, data]) => `
        <div onclick="selectedTile=${id}" style="background:${data.color}; width:100%; aspect-ratio:1; border:1px solid #555; cursor:pointer;"></div>
    `).join('');
}

function resetEditorGrid() {
    editorMap.cols = parseInt(document.getElementById('ed-cols').value);
    editorMap.rows = parseInt(document.getElementById('ed-rows').value);
    editorMap.grid = new Array(editorMap.cols * editorMap.rows).fill(0);
    renderEditor();
}

function initEditorInput() {
    edCanvas.onmousedown = (e) => { if(e.button === 0) paint(e); };
    edCanvas.onmousemove = (e) => { if(e.buttons === 1) paint(e); };
}

function paint(e) {
    const rect = edCanvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - edCanvas.width/2) / camera.zoom - camera.x;
    const my = (e.clientY - rect.top - edCanvas.height/2) / camera.zoom - camera.y;
    
    const startX = -(editorMap.cols * editorMap.tilesize) / 2;
    const startY = -(editorMap.rows * editorMap.tilesize) / 2;
    
    const col = Math.floor((mx - startX) / editorMap.tilesize);
    const row = Math.floor((my - startY) / editorMap.tilesize);
    
    if(col >= 0 && col < editorMap.cols && row >= 0 && row < editorMap.rows) {
        editorMap.grid[row * editorMap.cols + col] = selectedTile;
        renderEditor();
    }
}

function renderEditor() {
    if (document.getElementById('editor-screen').classList.contains('hidden')) return;
    edCanvas.width = edCanvas.parentElement.clientWidth;
    edCanvas.height = edCanvas.parentElement.clientHeight;
    
    edCtx.save();
    edCtx.translate(edCanvas.width/2, edCanvas.height/2);
    edCtx.scale(camera.zoom, camera.zoom);
    edCtx.translate(camera.x, camera.y);
    
    const size = editorMap.tilesize;
    const startX = -(editorMap.cols * size) / 2;
    const startY = -(editorMap.rows * size) / 2;

    editorMap.grid.forEach((id, i) => {
        edCtx.fillStyle = TILE_DATA[id].color;
        edCtx.fillRect(startX + (i % editorMap.cols) * size, startY + Math.floor(i / editorMap.cols) * size, size, size);
        edCtx.strokeStyle = "#222";
        edCtx.strokeRect(startX + (i % editorMap.cols) * size, startY + Math.floor(i / editorMap.cols) * size, size, size);
    });
    edCtx.restore();
}

function exportMap() {
    editorMap.name = document.getElementById('ed-name').value;
    editorMap.story = document.getElementById('ed-story').value;
    editorMap.rules = document.getElementById('ed-rules').value;
    document.getElementById('export-area').value = JSON.stringify(editorMap, null, 2);
    document.getElementById('export-modal').classList.remove('hidden');
}
