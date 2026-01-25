class Game {
    static currentTurn = 'player'; // 'player' or 'enemy'
    static gameActive = false;
    static highlightedTiles = [];
    static turnsTaken = 0;
    static timesSpotted = 0;
    static missionCompleted = false;
    
    static init() {
        // Initialize all systems
        Camera.init();
        Effects.init();
        Player.init();
        EnemyManager.init();
        Items.placedItems = [];
    }
    
    static start() {
        this.gameActive = true;
        this.currentTurn = 'player';
        this.turnsTaken = 0;
        this.timesSpotted = 0;
        this.missionCompleted = false;
        
        Player.resetTurn();
        this.updateHUD();
        this.showToolbar(true);
        
        // Initial camera focus
        Camera.focusOn(Player.x, Player.y);
        
        Game.showFeedback("Mission started. Your turn.");
    }
    
    static endTurn() {
        if (!this.gameActive) return;
        
        if (this.currentTurn === 'player') {
            // Player's turn ended
            Player.actionPoints = 0;
            
            // Update items
            Items.updateItems();
            
            // Switch to enemy turn
            this.currentTurn = 'enemy';
            this.turnsTaken++;
            this.showToolbar(false);
            
            Game.showFeedback("Enemy turn...");
            
            // Enemy AI takes turns
            setTimeout(() => {
                EnemyManager.takeTurns().then(() => {
                    // Enemy turn finished
                    this.currentTurn = 'player';
                    Player.resetTurn();
                    this.showToolbar(true);
                    
                    // Check win/lose conditions
                    this.checkGameState();
                    
                    Game.showFeedback("Your turn.");
                    this.updateHUD();
                    draw();
                });
            }, 1000);
            
        }
        
        this.updateHUD();
        draw();
    }
    
    static showToolbar(show) {
        const toolbar = document.getElementById('toolbar');
        if (toolbar) {
            toolbar.style.display = show ? 'flex' : 'none';
        }
        
        // Update turn indicator
        const turnEl = document.getElementById('hud-turn');
        if (turnEl) {
            turnEl.textContent = show ? 'Player' : 'Enemy';
            turnEl.style.color = show ? '#00ff00' : '#ff0000';
        }
    }
    
    static updateHUD() {
        if (!currentMapData) return;
        
        document.getElementById('hud-name').innerText = currentMapData.name;
        
        const statusEl = document.getElementById('hud-status');
        if (Player.spotted) {
            statusEl.innerText = 'SPOTTED!';
            statusEl.className = 'status bad';
        } else if (Player.hidden) {
            statusEl.innerText = 'HIDDEN';
            statusEl.className = 'status good';
        } else {
            statusEl.innerText = 'VISIBLE';
            statusEl.className = 'status warning';
        }
        
        const totalObj = Game.getObjectiveCount();
        const completed = Game.getCompletedObjectives();
        document.getElementById('hud-objectives').innerText = `${completed}/${totalObj}`;
        
        // Update character circle
        Player.updateCircle();
    }
    
    static highlightTiles(tiles, color, alpha) {
        this.highlightedTiles = tiles.map(t => ({
            x: t.x,
            y: t.y,
            color: color,
            alpha: alpha
        }));
        draw();
    }
    
    static highlightTile(x, y, color, alpha) {
        this.highlightedTiles.push({ x, y, color, alpha });
        draw();
    }
    
    static clearHighlights() {
        this.highlightedTiles = [];
        draw();
    }
    
    static showFeedback(text) {
        // Create feedback bubble at player position
        Effects.createFeedback(Player.x, Player.y, text);
    }
    
    static checkGameState() {
        // Check if player is dead
        if (Player.health <= 0) {
            this.gameOver("You have been defeated!");
            return;
        }
        
        // Check if player was spotted (for missions with "don't be spotted" rule)
        if (Player.spotted) {
            if (currentMapData.rules && currentMapData.rules.includes("don't be spotted")) {
                this.gameOver("You were spotted! Mission failed.");
                return;
            }
            this.timesSpotted++;
        }
        
        // Check win condition (exit reached)
        const exitTile = currentMapData.grid.findIndex(id => id === 99);
        if (exitTile !== -1) {
            const exitY = Math.floor(exitTile / currentMapData.cols);
            const exitX = exitTile % currentMapData.cols;
            
            if (Player.x === exitX && Player.y === exitY) {
                this.checkMissionCompletion();
                return;
            }
        }
        
        // Check if all enemies dead (for "kill all enemies" objective)
        if (currentMapData.objectives && currentMapData.objectives.includes("kill all enemies")) {
            if (EnemyManager.enemies.length === 0) {
                this.missionCompleted = true;
                Game.showFeedback("All enemies eliminated!");
            }
        }
    }
    
    static checkMissionCompletion() {
        let canExit = true;
        let missingObjectives = [];
        
        // Check rules
        if (currentMapData.rules) {
            if (currentMapData.rules.includes("don't be spotted") && Player.spotted) {
                canExit = false;
                Game.showFeedback("You were spotted! Cannot exit.");
            }
        }
        
        // Check objectives
        if (currentMapData.objectives) {
            currentMapData.objects?.forEach(obj => {
                if (obj.type === 'documents' || obj.type === 'steal') {
                    if (!Items.placedItems.some(i => i.type === 'documents' && i.x === Player.x && i.y === Player.y)) {
                        canExit = false;
                        missingObjectives.push(`Need to steal: ${obj.name}`);
                    }
                }
                
                if (obj.type === 'target') {
                    const targetEnemy = EnemyManager.enemies.find(e => e.x === obj.x && e.y === obj.y);
                    if (targetEnemy) {
                        canExit = false;
                        missingObjectives.push(`Target still alive: ${obj.name}`);
                    }
                }
            });
            
            if (currentMapData.objectives.includes("kill all enemies") && EnemyManager.enemies.length > 0) {
                canExit = false;
                missingObjectives.push("Not all enemies eliminated");
            }
        }
        
        if (canExit) {
            this.showWinScreen();
        } else {
            // Show exit confirmation with missing objectives
            let message = "Cannot exit yet:\n" + missingObjectives.join("\n");
            message += "\n\nStay and complete mission?";
            
            if (confirm(message)) {
                // Player chooses to stay
                Game.showFeedback("Continue mission...");
            } else {
                // Player chooses to leave (mission failed)
                this.gameOver("Mission abandoned!");
            }
        }
    }
    
    static getObjectiveCount() {
        let count = 0;
        if (currentMapData.objects) count += currentMapData.objects.length;
        if (currentMapData.objectives && currentMapData.objectives.includes("kill all enemies")) {
            count += EnemyManager.enemies.length;
        }
        return count;
    }
    
    static getCompletedObjectives() {
        let completed = 0;
        
        // Check stolen items
        if (currentMapData.objects) {
            currentMapData.objects.forEach(obj => {
                if (obj.type === 'documents' || obj.type === 'steal') {
                    if (Items.placedItems.some(i => i.type === 'documents' && i.x === Player.x && i.y === Player.y)) {
                        completed++;
                    }
                }
                
                if (obj.type === 'target') {
                    const targetEnemy = EnemyManager.enemies.find(e => e.x === obj.x && e.y === obj.y);
                    if (!targetEnemy) completed++;
                }
            });
        }
        
        // Check killed enemies for "kill all enemies" objective
        if (currentMapData.objectives && currentMapData.objectives.includes("kill all enemies")) {
            const initialEnemies = currentMapData.enemies ? currentMapData.enemies.length : 0;
            const remainingEnemies = EnemyManager.enemies.length;
            completed += (initialEnemies - remainingEnemies);
        }
        
        return completed;
    }
    
    static showWinScreen() {
        this.gameActive = false;
        
        // Calculate score
        const stealthKills = Player.stealthKills;
        const combatKills = Player.combatKills;
        const spottedPenalty = this.timesSpotted * 100;
        const turnPenalty = Math.floor(this.turnsTaken / 2);
        const itemsPenalty = Player.itemsUsed * 10;
        
        let totalScore = 1000;
        totalScore += stealthKills * 200;
        totalScore += combatKills * 100;
        totalScore -= spottedPenalty;
        totalScore -= turnPenalty;
        totalScore -= itemsPenalty;
        totalScore = Math.max(0, totalScore);
        
        // Determine rank
        let rank = "下忍";
        if (totalScore >= 1500) rank = "影";
        else if (totalScore >= 1200) rank = "上忍";
        else if (totalScore >= 900) rank = "中忍";
        else if (totalScore >= 600) rank = "青龍の忍";
        
        // Update win screen
        document.getElementById('score-stealth').textContent = stealthKills;
        document.getElementById('score-combat').textContent = combatKills;
        document.getElementById('score-spotted').textContent = this.timesSpotted;
        document.getElementById('score-turns').textContent = this.turnsTaken;
        document.getElementById('score-items').textContent = Player.itemsUsed;
        document.getElementById('score-total').textContent = totalScore;
        document.getElementById('rank-display').textContent = rank;
        
        switchScreen('win-screen');
    }
    
    static gameOver(reason) {
        this.gameActive = false;
        
        document.getElementById('gameover-reason').textContent = reason;
        switchScreen('gameover-screen');
    }
    
    static togglePause(show) {
        if (show) {
            // Update pause screen with current mission info
            document.getElementById('pause-rules').textContent = 
                currentMapData.rules ? currentMapData.rules.join(', ') : 'None';
            document.getElementById('pause-objectives').textContent = 
                currentMapData.objectives ? currentMapData.objectives.join(', ') : 'None';
        }
        
        document.getElementById('pause-screen').classList.toggle('hidden', !show);
    }
}

// Update the global draw function
function draw() {
    if (!currentMapData || document.getElementById('game-screen').classList.contains('hidden')) return;
    
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
    
    // Update camera and effects
    Camera.update();
    Effects.update();
    
    Camera.applyTransform();
    
    const map = currentMapData;
    const size = map.tilesize;
    const startX = -(map.cols * size) / 2;
    const startY = -(map.rows * size) / 2;
    
    // Draw tiles with Tenchu-style colors
    map.grid.forEach((id, i) => {
        const x = startX + (i % map.cols) * size;
        const y = startY + Math.floor(i / map.cols) * size;
        const tileInfo = TILE_DATA[id];
        
        if (tileInfo) {
            // Tenchu-style color scheme
            let color = tileInfo.color;
            if (id === 0) color = '#2a2a2a'; // Darker floor
            if (id === 20) color = '#000000'; // Black walls
            if (id === 99) color = '#ff3300'; // Red exit
            if (id === 100) color = '#00aa00'; // Green start
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y, size, size);
            
            // Add texture for certain tiles
            if (id === 50) { // Grass
                ctx.fillStyle = 'rgba(0, 100, 0, 0.3)';
                for (let j = 0; j < 5; j++) {
                    const bladeX = x + Math.random() * size;
                    const bladeY = y + Math.random() * size;
                    ctx.fillRect(bladeX, bladeY, 1, 3);
                }
            }
        }
        
        // Draw tile border
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.strokeRect(x, y, size, size);
    });
    
    // Draw highlighted tiles
    Game.highlightedTiles.forEach(tile => {
        const x = startX + tile.x * size;
        const y = startY + tile.y * size;
        
        ctx.fillStyle = tile.color;
        ctx.globalAlpha = tile.alpha;
        ctx.fillRect(x, y, size, size);
        ctx.globalAlpha = 1;
    });
    
    // Draw enemies
    EnemyManager.drawAll(ctx, startX, startY, size);
    
    // Draw items
    Items.drawAll(ctx, startX, startY, size);
    
    // Draw player
    const playerX = startX + Player.x * size;
    const playerY = startY + Player.y * size;
    
    // Player with Tenchu-style appearance
    if (Player.hidden) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeStyle = 'rgba(100,100,100,0.5)';
    } else if (Player.spotted) {
        ctx.fillStyle = '#ff0000';
        ctx.strokeStyle = '#ff6666';
    } else {
        ctx.fillStyle = '#00aa00';
        ctx.strokeStyle = '#00ff00';
    }
    
    // Draw player as ninja silhouette
    ctx.beginPath();
    ctx.arc(playerX + size/2, playerY + size/2, size/3, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw player health bar
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(playerX, playerY - 8, size, 4);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(playerX, playerY - 8, size * (Player.health / Player.maxHealth), 4);
    
    // Draw health text
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Player.health}/${Player.maxHealth}`, playerX + size/2, playerY - 10);
    
    // Draw effects
    Effects.drawAll(ctx, startX, startY, size);
    
    Camera.restoreTransform();
}

// Update the global startGame function
function startGame() {
    if (!currentMapData) return;
    
    Game.init();
    Game.start();
    switchScreen('game-screen');
    draw();
}

// Update the toolbar update function
function updateToolbar() {
    const container = document.getElementById('dynamic-items');
    container.innerHTML = inventory.map(item => `
        <div class="tool-btn special" onclick="Items.useItem('${item.id}')">
            ${item.icon}<br>USE
            <div class="qty-badge">${item.qty}</div>
        </div>
    `).join('');
}

// Add tutorial function
function showTutorial() {
    alert(`TENCHU-STYLE STEALTH GAME CONTROLS:

MOVEMENT:
- Click MOVE button to highlight movable tiles (3 tiles max)
- Click on green highlighted tile to move
- Each tile costs 1 Action Point (AP)

STEALTH:
- Stand on dark/shaded tiles to hide
- Click HIDE button when on hiding spot
- Hidden enemies can't see you

COMBAT:
- Click ATTACK to highlight enemies in range (1 tile)
- Hidden + close to unaware enemy = STEALTH KILL (instant)
- Regular attack damages enemy, alerts others

ITEMS:
- Use items from toolbar (3 tile range)
- Bomb: Explodes after 1-3 turns, damages enemies
- Gas: Sleep gas, makes enemies vulnerable
- Trap: Instant kill when stepped on
- Rice: Distracts enemies, poisoned

ENEMY STATES:
- Green: Normal patrol
- Orange: Investigating
- Purple: Alerted
- Red: Chasing/Attacking

WIN CONDITIONS:
- Complete mission objectives
- Reach the red exit tile
- Follow mission rules`);
}