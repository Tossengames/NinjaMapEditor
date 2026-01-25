class Player {
    static x = 0;
    static y = 0;
    static hidden = false;
    static health = 100;
    static maxHealth = 100;
    static spotted = false;
    static inHiding = false;
    static actionPoints = 3;
    static maxActionPoints = 3;
    static stealthKills = 0;
    static combatKills = 0;
    static itemsUsed = 0;
    static currentAction = null; // 'move', 'attack', 'item'
    static itemToUse = null; // Item being used
    
    static init() {
        if (currentMapData && currentMapData.player) {
            this.x = currentMapData.player.x;
            this.y = currentMapData.player.y;
        }
        this.currentAction = null;
        this.itemToUse = null;
        this.updateCircle();
        this.updateToolbarButtons();
    }
    
    static startTurn() {
        this.resetTurn();
        this.currentAction = 'move';
        this.startMove(); // Auto-start move mode
        this.updateToolbarButtons();
    }
    
    static updateCircle() {
        const circle = document.getElementById('char-circle');
        if (!circle) return;
        
        circle.classList.remove('can-kill');
        
        if (this.hidden) {
            circle.innerHTML = "🫥";
            circle.style.borderColor = "#000";
            circle.style.background = "#111";
        } else if (this.spotted) {
            circle.innerHTML = "🚨";
            circle.style.borderColor = "#ff0000";
            circle.style.background = "#330000";
        } else {
            circle.innerHTML = "👤";
            circle.style.borderColor = "var(--gold)";
            circle.style.background = "#333";
        }
        
        // Check for stealth kill opportunities
        const enemiesInRange = EnemyManager.getEnemiesInRange(this.x, this.y, 1);
        const canStealthKill = enemiesInRange.length > 0 && this.actionPoints > 0 && this.hidden;
        
        if (canStealthKill) {
            circle.classList.add('can-kill');
            circle.style.borderColor = "#ffffff";
            circle.style.boxShadow = "0 0 20px white";
        }
        
        // Update HUD AP display
        const hudAP = document.getElementById('hud-ap');
        if (hudAP) {
            hudAP.textContent = `${this.actionPoints}/${this.maxActionPoints}`;
            hudAP.style.color = this.actionPoints > 0 ? '#00ff00' : '#ff0000';
        }
    }
    
    static updateToolbarButtons() {
        const moveBtn = document.getElementById('move-btn');
        const attackBtn = document.getElementById('attack-btn');
        const endBtn = document.getElementById('end-btn');
        
        if (Game.currentTurn !== 'player') {
            if (moveBtn) moveBtn.classList.add('disabled');
            if (attackBtn) attackBtn.classList.add('disabled');
            if (endBtn) endBtn.classList.add('disabled');
            return;
        }
        
        // MOVE button
        if (moveBtn) {
            if (this.actionPoints > 0) {
                moveBtn.classList.remove('disabled');
                moveBtn.onclick = () => this.startMove();
            } else {
                moveBtn.classList.add('disabled');
            }
        }
        
        // ATTACK button
        if (attackBtn) {
            const enemiesInRange = EnemyManager.getEnemiesInRange(this.x, this.y, 1);
            if (this.actionPoints > 0 && enemiesInRange.length > 0) {
                attackBtn.classList.remove('disabled');
                attackBtn.onclick = () => this.attack();
            } else {
                attackBtn.classList.add('disabled');
            }
        }
        
        // END button
        if (endBtn) {
            endBtn.classList.remove('disabled');
            endBtn.onclick = () => Game.endTurn();
        }
    }
    
    static startMove() {
        if (Game.currentTurn !== 'player' || this.actionPoints <= 0) return;
        
        this.currentAction = 'move';
        this.itemToUse = null;
        canvas.onclick = null; // Clear previous click handlers
        Game.clearHighlights();
        
        // Calculate movable tiles
        const movable = this.getMovableTiles();
        
        if (movable.length === 0) {
            Game.showFeedback("No moves available!");
            return;
        }
        
        // Highlight tiles
        Game.highlightTiles(movable, '#00ff00', 0.3);
        
        // Set up click handler for movement
        canvas.onclick = (e) => {
            const pos = Camera.screenToWorld(e.clientX, e.clientY);
            const tilePos = Camera.worldToTile(pos.x, pos.y);
            
            if (!tilePos) return;
            
            const { tileX, tileY } = tilePos;
            
            // Check if tile is movable
            const isMovable = movable.some(t => t.x === tileX && t.y === tileY);
            if (isMovable) {
                this.moveTo(tileX, tileY);
                canvas.onclick = null;
                Game.clearHighlights();
                this.currentAction = null;
            }
        };
        
        Game.showFeedback("Select a tile to move (Green highlights)");
    }
    
    static getMovableTiles() {
        const tiles = [];
        const maxRange = Math.min(3, this.actionPoints);
        
        for (let dx = -maxRange; dx <= maxRange; dx++) {
            for (let dy = -maxRange; dy <= maxRange; dy++) {
                const dist = Math.abs(dx) + Math.abs(dy);
                if (dist > maxRange || dist === 0) continue;
                
                const newX = this.x + dx;
                const newY = this.y + dy;
                
                // Check bounds
                if (newX < 0 || newX >= currentMapData.cols || 
                    newY < 0 || newY >= currentMapData.rows) continue;
                
                // Check if tile is walkable
                const tileIndex = newY * currentMapData.cols + newX;
                const tileId = currentMapData.grid[tileIndex];
                const tileInfo = TILE_DATA[tileId];
                
                if (tileInfo && tileInfo.walkable) {
                    // Check if tile has enemy
                    const hasEnemy = EnemyManager.enemies.some(e => e.x === newX && e.y === newY);
                    if (!hasEnemy) {
                        tiles.push({ x: newX, y: newY, distance: dist });
                    }
                }
            }
        }
        
        return tiles;
    }
    
    static moveTo(x, y) {
        const dist = Math.abs(x - this.x) + Math.abs(y - this.y);
        if (dist > this.actionPoints) {
            Game.showFeedback("Not enough action points!");
            return;
        }
        
        this.x = x;
        this.y = y;
        this.actionPoints -= dist;
        
        // Check tile effects (auto-hide)
        this.checkCurrentTile();
        
        // Smooth camera focus
        Camera.smoothFocusOn(x, y);
        
        Game.showFeedback(`Moved to (${x}, ${y}) - ${this.actionPoints} AP remaining`);
        
        this.updateCircle();
        this.updateToolbarButtons();
        draw();
        
        // If no action points left, auto-end turn after delay
        if (this.actionPoints <= 0) {
            setTimeout(() => Game.endTurn(), 1000);
        }
    }
    
    static checkCurrentTile() {
        const tileIndex = this.y * currentMapData.cols + this.x;
        const tileId = currentMapData.grid[tileIndex];
        
        // Check if in hiding spot
        const tileInfo = TILE_DATA[tileId];
        if (tileInfo && tileInfo.hide) {
            this.inHiding = true;
            if (!this.hidden) {
                this.hidden = true;
                Game.showFeedback("You're hiding in the shadows!");
            }
        } else {
            this.inHiding = false;
            if (this.hidden) {
                this.hidden = false;
                Game.showFeedback("You left hiding spot.");
            }
        }
        
        // Check for items on tile (traps)
        Items.checkTileForItems(this.x, this.y);
        
        this.updateCircle();
        Game.updateHUD();
    }
    
    static attack() {
        if (Game.currentTurn !== 'player' || this.actionPoints <= 0) return;
        
        this.currentAction = 'attack';
        this.itemToUse = null;
        canvas.onclick = null;
        Game.clearHighlights();
        
        const enemiesInRange = EnemyManager.getEnemiesInRange(this.x, this.y, 1);
        
        if (enemiesInRange.length === 0) {
            Game.showFeedback("No enemies in attack range!");
            this.currentAction = null;
            return;
        }
        
        // Highlight enemies in range
        enemiesInRange.forEach(enemy => {
            Game.highlightTile(enemy.x, enemy.y, '#ff0000', 0.5);
        });
        
        // Set up click handler for attack
        canvas.onclick = (e) => {
            const pos = Camera.screenToWorld(e.clientX, e.clientY);
            const tilePos = Camera.worldToTile(pos.x, pos.y);
            
            if (!tilePos) return;
            
            const { tileX, tileY } = tilePos;
            
            // Check if clicked on enemy in range
            const target = enemiesInRange.find(e => e.x === tileX && e.y === tileY);
            if (target) {
                this.performAttack(target);
                canvas.onclick = null;
                Game.clearHighlights();
                this.currentAction = null;
            }
        };
        
        Game.showFeedback("Select an enemy to attack (Red highlights)");
    }
    
    static performAttack(enemy) {
        // Check if stealth kill (player hidden)
        const isStealthKill = this.hidden;
        
        if (isStealthKill) {
            // Stealth kill - instant kill, no AP cost
            Effects.createBlood(enemy.x, enemy.y);
            Sound.play('stealth_kill');
            EnemyManager.removeEnemy(enemy.id);
            this.stealthKills++;
            Game.showFeedback(`Stealth kill! ${enemy.type} eliminated silently.`);
            
            // Show kill feedback
            Effects.showDamageText(enemy.x, enemy.y, "STEALTH KILL", "#ffffff");
            
            // End turn after stealth kill
            setTimeout(() => Game.endTurn(), 800);
        } else {
            // Regular attack - costs 1 AP
            if (this.actionPoints <= 0) return;
            
            this.actionPoints--;
            const damage = 25;
            const died = enemy.takeDamage(damage);
            
            Effects.showDamageText(enemy.x, enemy.y, `-${damage}`, "#ff0000");
            Sound.play('attack');
            
            if (died) {
                Effects.createBlood(enemy.x, enemy.y);
                EnemyManager.removeEnemy(enemy.id);
                this.combatKills++;
                Game.showFeedback(`Defeated ${enemy.type}!`);
            } else {
                enemy.alerted = true;
                enemy.state = 'chasing';
                Game.showFeedback(`Attacked ${enemy.type} for ${damage} damage!`);
            }
            
            // Check if should end turn
            if (this.actionPoints <= 0) {
                setTimeout(() => Game.endTurn(), 800);
            }
        }
        
        this.updateCircle();
        this.updateToolbarButtons();
        draw();
    }
    
    static startItemUse(itemId) {
        if (Game.currentTurn !== 'player' || this.actionPoints <= 0) return;
        
        this.currentAction = 'item';
        this.itemToUse = itemId;
        canvas.onclick = null;
        Game.clearHighlights();
        
        Items.prepareItemUse(itemId);
    }
    
    static takeDamage(damage) {
        this.health -= damage;
        Game.showFeedback(`Took ${damage} damage! Health: ${this.health}`);
        
        if (this.health <= 0) {
            Game.gameOver("You have been defeated!");
        }
        
        this.updateCircle();
        Game.updateHUD();
        draw();
    }
    
    static resetTurn() {
        this.actionPoints = this.maxActionPoints;
        this.currentAction = null;
        this.itemToUse = null;
        this.updateCircle();
        this.updateToolbarButtons();
    }
}