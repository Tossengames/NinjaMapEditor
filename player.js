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
    
    static init() {
        if (currentMapData && currentMapData.player) {
            this.x = currentMapData.player.x;
            this.y = currentMapData.player.y;
        }
        this.updateCircle();
    }
    
    static updateCircle() {
        const circle = document.getElementById('char-circle');
        if (!circle) return;
        
        circle.classList.remove('can-kill');
        
        if (this.hidden) {
            circle.innerHTML = "🫥";
            circle.style.borderColor = "#000";
        } else if (this.spotted) {
            circle.innerHTML = "🚨";
            circle.style.borderColor = "#ff0000";
        } else {
            circle.innerHTML = "👤";
            circle.style.borderColor = "var(--gold)";
        }
        
        // Check for stealth kill opportunities
        const enemiesInRange = EnemyManager.getEnemiesInRange(this.x, this.y, 1);
        const canStealthKill = enemiesInRange.length > 0 && this.actionPoints > 0;
        
        if (canStealthKill) {
            circle.classList.add('can-kill');
            circle.style.borderColor = "#ffffff";
        }
    }
    
    static startMove() {
        if (Game.currentTurn !== 'player' || this.actionPoints <= 0) return;
        
        // Calculate movable tiles
        const movable = this.getMovableTiles();
        
        // Highlight tiles
        Game.highlightTiles(movable, '#00ff00', 0.3);
        
        // Set up click handler for movement
        canvas.onclick = (e) => {
            const pos = Camera.screenToWorld(e.clientX, e.clientY);
            const tileX = Math.floor((pos.x + (currentMapData.cols * currentMapData.tilesize) / 2) / currentMapData.tilesize);
            const tileY = Math.floor((pos.y + (currentMapData.rows * currentMapData.tilesize) / 2) / currentMapData.tilesize);
            
            // Check if tile is movable
            const isMovable = movable.some(t => t.x === tileX && t.y === tileY);
            if (isMovable) {
                this.moveTo(tileX, tileY);
                canvas.onclick = null;
                Game.clearHighlights();
            }
        };
        
        Game.showFeedback("Select a tile to move (Green highlights)");
    }
    
    static getMovableTiles() {
        const tiles = [];
        const maxRange = 3;
        
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
        
        // Check tile effects
        this.checkCurrentTile();
        
        // Check for stealth kill opportunities
        this.updateCircle();
        
        // Focus camera on player
        Camera.focusOn(x, y);
        
        Game.showFeedback(`Moved to (${x}, ${y}) - ${this.actionPoints} AP remaining`);
        
        // If no action points left, end turn
        if (this.actionPoints <= 0) {
            setTimeout(() => Game.endTurn(), 500);
        }
        
        draw();
    }
    
    static checkCurrentTile() {
        const tileIndex = this.y * currentMapData.cols + this.x;
        const tileId = currentMapData.grid[tileIndex];
        
        // Check if in hiding spot
        const tileInfo = TILE_DATA[tileId];
        if (tileInfo && tileInfo.hide) {
            this.inHiding = true;
            if (!this.hidden) {
                this.toggleHide();
            }
        } else {
            this.inHiding = false;
            if (this.hidden) {
                this.hidden = false;
            }
        }
        
        // Check for items on tile
        Items.checkTileForItems(this.x, this.y);
    }
    
    static toggleHide() {
        if (!this.inHiding) {
            Game.showFeedback("No hiding spot here!");
            return;
        }
        
        if (this.actionPoints <= 0) {
            Game.showFeedback("No action points left!");
            return;
        }
        
        this.hidden = !this.hidden;
        this.actionPoints--;
        
        Game.showFeedback(this.hidden ? "You're now hiding!" : "You left hiding spot.");
        
        // If no action points left, end turn
        if (this.actionPoints <= 0) {
            setTimeout(() => Game.endTurn(), 500);
        }
        
        this.updateCircle();
        Game.updateHUD();
        draw();
    }
    
    static attack() {
        if (Game.currentTurn !== 'player' || this.actionPoints <= 0) return;
        
        const enemiesInRange = EnemyManager.getEnemiesInRange(this.x, this.y, 1);
        
        if (enemiesInRange.length === 0) {
            Game.showFeedback("No enemies in attack range!");
            return;
        }
        
        // Highlight enemies in range
        enemiesInRange.forEach(enemy => {
            Game.highlightTile(enemy.x, enemy.y, '#ff0000', 0.5);
        });
        
        // Set up click handler for attack
        canvas.onclick = (e) => {
            const pos = Camera.screenToWorld(e.clientX, e.clientY);
            const tileX = Math.floor((pos.x + (currentMapData.cols * currentMapData.tilesize) / 2) / currentMapData.tilesize);
            const tileY = Math.floor((pos.y + (currentMapData.rows * currentMapData.tilesize) / 2) / currentMapData.tilesize);
            
            // Check if clicked on enemy in range
            const target = enemiesInRange.find(e => e.x === tileX && e.y === tileY);
            if (target) {
                this.performAttack(target);
                canvas.onclick = null;
                Game.clearHighlights();
            }
        };
        
        Game.showFeedback("Select an enemy to attack (Red highlights)");
    }
    
    static performAttack(enemy) {
        this.actionPoints--;
        
        // Check if stealth kill (enemy not alerted and player hidden)
        const isStealthKill = this.hidden && !enemy.alerted;
        
        if (isStealthKill) {
            // Stealth kill - instant kill
            Effects.createBlood(enemy.x, enemy.y);
            Sound.play('stealth_kill');
            EnemyManager.removeEnemy(enemy.id);
            this.stealthKills++;
            Game.showFeedback(`Stealth kill! ${enemy.type} eliminated silently.`);
            
            // Show kill feedback
            Effects.showDamageText(enemy.x, enemy.y, "STEALTH KILL", "#ffffff");
        } else {
            // Combat attack
            const damage = 25;
            enemy.health -= damage;
            
            Effects.showDamageText(enemy.x, enemy.y, `-${damage}`, "#ff0000");
            Sound.play('attack');
            
            if (enemy.health <= 0) {
                Effects.createBlood(enemy.x, enemy.y);
                EnemyManager.removeEnemy(enemy.id);
                this.combatKills++;
                Game.showFeedback(`Defeated ${enemy.type}!`);
            } else {
                enemy.alerted = true;
                enemy.state = 'chasing';
                Game.showFeedback(`Attacked ${enemy.type} for ${damage} damage!`);
            }
        }
        
        // If no action points left, end turn
        if (this.actionPoints <= 0) {
            setTimeout(() => Game.endTurn(), 500);
        }
        
        this.updateCircle();
        draw();
    }
    
    static takeDamage(damage) {
        this.health -= damage;
        Game.showFeedback(`Took ${damage} damage! Health: ${this.health}`);
        
        if (this.health <= 0) {
            Game.gameOver("You have been defeated!");
        }
        
        Game.updateHUD();
        draw();
    }
    
    static resetTurn() {
        this.actionPoints = this.maxActionPoints;
    }
}