const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const levelFiles = ["level1.json", "level2.json"]; 
const AVAILABLE_ITEMS = [
    { id: 'rice', name: 'Poison Rice', icon: '🍙', effect: 'distract' },
    { id: 'bomb', name: 'Smoke Bomb', icon: '💨', effect: 'blind' },
    { id: 'gas', name: 'Sleep Gas', icon: '🧪', effect: 'sleep' },
    { id: 'potion', name: 'Health Pot', icon: '❤️', effect: 'heal' },
    { id: 'trap', name: 'Caltrops', icon: '🪤', effect: 'slow' }
];

// Enhanced tile system with Tenchu colors
const TILE_DATA = {
    0: { color: '#2a2a2a', name: 'floor', walkable: true }, 
    20: { color: '#000000', name: 'wall', walkable: false },
    50: { color: '#1a3300', name: 'grass', walkable: true, hide: true },
    70: { color: '#330033', name: 'dark', walkable: true, hide: true },
    80: { color: '#002244', name: 'water', walkable: false },
    90: { color: '#330000', name: 'blood', walkable: true },
    99: { color: '#ff3300', name: 'exit', walkable: true },
    100: { color: '#00aa00', name: 'start', walkable: true },
    101: { color: '#003300', name: 'hiding', walkable: true, hide: true },
    200: { color: '#990000', name: 'danger', walkable: true },
    201: { color: '#cc0000', name: 'enemy', walkable: true },
    202: { color: '#ff6600', name: 'boss', walkable: true },
    300: { color: '#ffff00', name: 'objective', walkable: true },
    301: { color: '#ffcc00', name: 'steal', walkable: true },
    302: { color: '#cc00cc', name: 'target', walkable: true }
};

// Global variables
let currentMapData = null;
let inventory = [];

// Navigation functions
function switchScreen(id) {
    document.querySelectorAll('.screen, #game-screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function showMenu() { 
    switchScreen('menu-screen'); 
}

function showMissionList() {
    switchScreen('mission-screen');
    const list = document.getElementById('level-list');
    list.innerHTML = levelFiles.map(f => `<div class="list-item" onclick="loadMission('${f}')">${f.replace('.json', '').toUpperCase()}</div>`).join('');
}

async function loadMission(file) {
    try {
        const res = await fetch(file);
        currentMapData = await res.json();
        
        // Update UI
        document.getElementById('info-name').innerText = currentMapData.name;
        document.getElementById('info-story').innerText = currentMapData.story;
        document.getElementById('info-rules').innerText = currentMapData.rules ? currentMapData.rules.join(', ') : 'None';
        document.getElementById('info-objectives').innerText = currentMapData.objectives ? currentMapData.objectives.join(', ') : 'None';
        
        switchScreen('info-screen');
    } catch (error) {
        alert(`Failed to load mission: ${error}`);
        showMissionList();
    }
}

// Inventory functions
function showItemSelection() {
    switchScreen('item-screen');
    inventory = [];
    const grid = document.getElementById('item-grid');
    grid.innerHTML = AVAILABLE_ITEMS.map(item => `
        <div class="item-card" id="card-${item.id}" onclick="addItem('${item.id}')">
            <div style="font-size:24px">${item.icon}</div>
            <div>${item.name}</div>
        </div>
    `).join('');
    updateInvUI();
}

function addItem(id) {
    const itemData = AVAILABLE_ITEMS.find(i => i.id === id);
    const existing = inventory.find(i => i.id === id);
    const totalQty = inventory.reduce((sum, i) => sum + i.qty, 0);

    if (totalQty >= 5) return alert("Max capacity (5) reached!");

    if (existing) {
        existing.qty++;
    } else {
        if (inventory.length >= 3) return alert("Max 3 types allowed!");
        inventory.push({ ...itemData, qty: 1 });
    }
    updateInvUI();
}

function removeItem(id) {
    const item = inventory.find(i => i.id === id);
    if (item) {
        item.qty--;
        if (item.qty <= 0) inventory = inventory.filter(i => i.id !== id);
    }
    updateInvUI();
}

function updateInvUI() {
    const display = document.getElementById('loadout-display');
    const totalQty = inventory.reduce((sum, i) => sum + i.qty, 0);
    document.getElementById('total-qty-label').innerText = `Total: ${totalQty} / 5`;
    
    display.innerHTML = "";
    for (let i = 0; i < 3; i++) {
        const item = inventory[i];
        const slot = document.createElement('div');
        slot.className = `slot ${item ? 'filled' : ''}`;
        if (item) {
            slot.innerHTML = `${item.icon}<div class="qty-badge">${item.qty}</div>`;
            slot.onclick = () => removeItem(item.id);
        }
        display.appendChild(slot);
    }

    AVAILABLE_ITEMS.forEach(it => {
        const card = document.getElementById(`card-${it.id}`);
        if(card) card.classList.toggle('active', inventory.some(inv => inv.id === it.id));
    });
}

// Start game
function startGame() {
    if (!currentMapData) return;
    
    Game.init();
    Game.start();
    switchScreen('game-screen');
    draw();
}

// Pause function
function togglePause(p) { 
    Game.togglePause(p);
}

// Initialize on load
window.onload = () => { 
    window.onresize = draw;
};