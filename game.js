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
    const screen = document.getElementById(id);
    if (screen) {
        screen.classList.remove('hidden');
    }
    
    // Update pause screen if showing
    if (id === 'pause-screen' && currentMapData) {
        updatePauseScreen();
    }
}

function showMenu() { 
    Game.gameActive = false;
    switchScreen('menu-screen'); 
}

function showMissionList() {
    switchScreen('mission-screen');
    const list = document.getElementById('level-list');
    if (list) {
        list.innerHTML = levelFiles.map(f => `<div class="list-item" onclick="loadMission('${f}')">${f.replace('.json', '').toUpperCase()}</div>`).join('');
    }
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
        showFeedback(`Failed to load mission: ${error}`);
        showMissionList();
    }
}

// Inventory functions
function showItemSelection() {
    switchScreen('item-screen');
    inventory = [];
    const grid = document.getElementById('item-grid');
    if (grid) {
        grid.innerHTML = AVAILABLE_ITEMS.map(item => `
            <div class="item-card" id="card-${item.id}" onclick="addItem('${item.id}')">
                <div style="font-size:24px">${item.icon}</div>
                <div>${item.name}</div>
            </div>
        `).join('');
    }
    updateInvUI();
}

function addItem(id) {
    const itemData = AVAILABLE_ITEMS.find(i => i.id === id);
    const existing = inventory.find(i => i.id === id);
    const totalQty = inventory.reduce((sum, i) => sum + i.qty, 0);

    if (totalQty >= 5) {
        showFeedback("Max capacity (5) reached!");
        return;
    }

    if (existing) {
        existing.qty++;
    } else {
        if (inventory.length >= 3) {
            showFeedback("Max 3 types allowed!");
            return;
        }
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
    
    if (display) {
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
    }

    AVAILABLE_ITEMS.forEach(it => {
        const card = document.getElementById(`card-${it.id}`);
        if(card) card.classList.toggle('active', inventory.some(inv => inv.id === it.id));
    });
    
    // Update toolbar items
    updateToolbar();
}

// Update toolbar function
function updateToolbar() {
    const container = document.getElementById('dynamic-items');
    if (container) {
        container.innerHTML = inventory.map(item => `
            <div class="tool-btn special" onclick="useItem('${item.id}')">
                ${item.icon}<br>${item.name.split(' ')[0]}
                <div class="qty-badge">${item.qty}</div>
            </div>
        `).join('');
    }
}

// Item use function
function useItem(id) {
    if (Game.currentTurn !== 'player') return;
    
    const item = inventory.find(i => i.id === id);
    if (!item || item.qty <= 0) return;
    
    Items.useItem(id);
}

// Start game - FIXED VERSION
function startGame() {
    if (!currentMapData) {
        showFeedback("No mission loaded!");
        return;
    }
    
    try {
        Game.init();
        Game.start();
        switchScreen('game-screen');
        
        // Force initial draw
        setTimeout(() => {
            if (canvas) {
                draw();
            }
        }, 100);
        
        console.log("Game started successfully!");
    } catch (error) {
        console.error("Error starting game:", error);
        showFeedback(`Error starting game: ${error.message}`);
    }
}

// Pause function
function togglePause(p) { 
    Game.togglePause(p);
}

// Update pause screen
function updatePauseScreen() {
    if (!currentMapData) return;
    
    const elements = {
        'pause-name': currentMapData.name,
        'pause-status': Player.hidden ? 'HIDDEN' : Player.spotted ? 'SPOTTED' : 'VISIBLE',
        'pause-health': `${Player.health}/${Player.maxHealth}`,
        'pause-ap': `${Player.actionPoints}/${Player.maxActionPoints}`,
        'pause-objectives-count': `${Game.getCompletedObjectives()}/${Game.getObjectiveCount()}`,
        'pause-turn': Game.currentTurn === 'player' ? 'Player' : 'Enemy',
        'pause-stealth': Player.stealthKills,
        'pause-combat': Player.combatKills,
        'pause-rules': currentMapData.rules ? currentMapData.rules.join(', ') : 'None',
        'pause-objectives': currentMapData.objectives ? currentMapData.objectives.join(', ') : 'None'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Show feedback without browser alerts
function showFeedback(text) {
    if (Game.gameActive) {
        Effects.createFeedback(Player.x, Player.y, text);
    } else {
        // Create a temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = 'feedback-bubble';
        feedback.textContent = text;
        feedback.style.position = 'fixed';
        feedback.style.top = '50%';
        feedback.style.left = '50%';
        feedback.style.transform = 'translate(-50%, -50%)';
        feedback.style.zIndex = '1000';
        
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 3000);
    }
}

// Initialize on load
window.onload = () => { 
    // Make sure canvas exists before setting resize handler
    if (canvas) {
        window.onresize = draw;
    }
    console.log("Game loaded successfully!");
};