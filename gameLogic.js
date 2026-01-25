class Game {
    static currentTurn = 'player';
    static gameActive = false;
    static highlightedTiles = [];
    static turnsTaken = 0;
    static timesSpotted = 0;
    static missionCompleted = false;
    
    static init() {
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
        
        // Start camera on player
        Camera.reset();
        Camera.smoothFocusOn(Player.x, Player.y);
        
        Player.startTurn();
        this.showToolbar(true);
        
        showFeedback("Mission started. Your turn.");
        draw();
    }
    
    static async endTurn() {
        if (!this.gameActive) return;
        
        if (this.currentTurn === 'player') {
            // Player's turn ended
            canvas.onclick = null;
            Game.clearHighlights();
            
            // Update items
            Items.updateItems();
            
            // Switch to enemy turn
            this.currentTurn = 'enemy';
            this.turnsTaken++;
            this.showToolbar(false);
            
            showFeedback("Enemy turn...");
            
            // Enemy AI takes turns
            await EnemyManager.takeTurns();
            
            // Enemy turn finished
            this.currentTurn = 'player';
            
            // Check win/lose conditions
            this.checkGameState();
            
            if (this.gameActive) {
                Player.startTurn();
                this.showToolbar(true);
                Camera.smoothFocusOn(Player.x, Player.y);
                showFeedback("Your turn.");
            }
        }
        
        draw();
    }
    
    static showToolbar(show) {
        const toolbar = document.getElementById('toolbar');
        if (toolbar) {
            toolbar.style.display = show ? 'flex' : 'none';
        }
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
                showFeedback("All enemies eliminated!");
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
                missingObjectives.push("You were spotted!");
            }
        }
        
        // Check objectives
        if (currentMapData.objectives) {
            currentMapData.objects?.forEach(obj => {
                if (obj.type === 'documents' || obj.type === 'steal') {
                    // Check if player has the item
                    const hasItem = Items.placedItems.some(i => 
                        (i.type === 'documents' || i.type === obj.type) && 
                        i.x === Player.x && 
                        i.y === Player.y
                    );
                    if (!hasItem) {
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
            // Show exit confirmation in-game (no browser alert)
            let message = "Cannot exit yet:\n" + missingObjectives.join("\n");
            showFeedback(message);
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
                    const hasItem = Items.placedItems.some(i => 
                        (i.type === 'documents' || i.type === obj.type) && 
                        i.x === Player.x && 
                        i.y === Player.y
                    );
                    if (hasItem) completed++;
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
            updatePauseScreen();
        }
        
        document.getElementById('pause-screen').classList.toggle('hidden', !show);
    }
}