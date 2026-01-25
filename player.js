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
    static currentAction = null;
    static moving = false;
    static movePath = [];
    static moveStep = 0;
    
    static init() {
        if (currentMapData && currentMapData.player) {
            this.x = currentMapData.player.x;
            this.y = currentMapData.player.y;
        }
        this.currentAction = null;
        this.moving = false;
        this.movePath = [];
        this.updateCircle();
    }
    
    static startTurn() {
        this.resetTurn();
        this.currentAction = 'move';
        this.startMove(); // Auto-start move mode
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
    }
    
    static updateToolbarButtons() {
        const moveBtn = document.getElementById('move-btn');
        const attackBtn = document.getElementById('attack-btn');
        const endBtn = document.getElementById('end-btn');
        
        if (Game.currentTurn !== 'player' || this.moving) {
            if (moveBtn) moveBtn.classList.add('disabled');
            if (attackBtn) attackBtn.classList.add('disabled');
            if (endBtn) endBtn.classList.add('disabled');
            return;
        }
        
        // MOVE button
        if (moveBtn) {
            if (this.actionPoints > 0) {
                moveBtn.classList.remove('disabled');
            } else {
                moveBtn.classList.add('disabled');
            }
        }
        
        // ATTACK button
        if (attackBtn) {
            const enemiesInRange = EnemyManager.getEnemiesInRange(this.x, this.y, 1);
            if (this.actionPoints > 0 && enemiesInRange.length > 0) {
                attackBtn.classList.remove('disabled');
            } else {
                attackBtn.classList.add('disabled');
            }
        }
        
        // END button
        if (endBtn) {
            endBtn.classList.remove('disabled');
        }
    }
    
    static startMove() {
        if (Game.currentTurn !== 'player' || this.actionPoints <= 0 || this.moving) return;
        
        this.currentAction = 'move';
        this.itemToUse = null;
        canvas.onclick = null;
        Game.clearHighlights();
        
        // Calculate movable tiles
        const movable = this.getMovableTiles();
        
        if (movable.length === 0) {
            showFeedback("No moves available!");
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
        
        showFeedback("Select a tile to move (Green highlights)");
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
    
    static moveTo(targetX, targetY) {
        const dist = Math.abs(targetX - this.x) + Math.abs(targetY - this.y);
        if (dist > this.actionPoints || this.moving) {
            showFeedback("Cannot move there!");
            return;
        }
        
        // Create path for smooth movement
        this.movePath = [];
        let currentX = this.x;
        let currentY = this.y;
        
        while (currentX !== targetX || currentY !== targetY) {
            if (currentX < targetX) {
                currentX++;
            } else if (currentX > targetX) {
                currentX--;
            } else if (currentY < targetY) {
                currentY++;
            } else if (currentY > targetY) {
                currentY--;
            }
            this.movePath.push({ x: currentX, y: currentY });
        }
        
        this.moving = true;
        this.moveStep = 0;
        this.performMoveStep();
    }
    
    static performMoveStep() {
        if (this.moveStep >= this.movePath.length) {
            // Movement complete
            this.moving = false;
            this.actionPoints -= this.movePath.length;
            
            // Check tile effects (auto-hide)
            this.checkCurrentTile();
            
            showFeedback(`Moved - ${this.actionPoints} AP remaining`);
            
            this.updateCircle();
            this.updateToolbarButtons();
            
            // If no action points left, auto-end turn after delay
            if (this.actionPoints <= 0) {
                setTimeout(() => Game.endTurn(), 1000);
            }
            
            draw();
            return;
        }
        
        const nextPos = this.movePath[this.moveStep];
        this.x = nextPos.x;
        this.y = nextPos.y;
        this.moveStep++;
        
        // Smooth camera follow during movement
        Camera.smoothFocusOn(this.x, this.y);
        
        // Continue to next step with delay
        setTimeout(() => this.performMoveStep(), 200);
        
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
                this.hidden = true;
                showFeedback("You're hiding in the shadows!");
            }
        } else {
            this.inHiding = false;
            if (this.hidden) {
                this.hidden = false;
                showFeedback("You left hiding spot.");
            }
        }
        
        // Check for items on tile (traps)
        Items.checkTileForItems(this.x, this.y);
        
        this.updateCircle();
    }
    
    static attack() {
        if (Game.currentTurn !== 'player' || this.actionPoints <= 0 || this.moving) return;
        
        this.currentAction = 'attack';
        this.itemToUse = null;
        canvas.onclick = null;
        Game.clearHighlights();
        
        const enemiesInRange = EnemyManager.getEnemiesInRange(this.x, this.y, 1);
        
        if (enemiesInRange.length === 0) {
            showFeedback("No enemies in attack range!");
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
        
        showFeedback("Select an enemy to attack (Red highlights)");
    }
    
    static performAttack(enemy) {
        // Check if stealth kill (player hidden)
        const isStealthKill = this.hidden;
        
        if (isStealthKill) {
            // Stealth kill - instant kill, no AP cost
            Effects.createStealthEffect(enemy.x, enemy.y);
            EnemyManager.removeEnemy(enemy.id);
            this.stealthKills++;
            showFeedback(`Stealth kill! ${enemy.type} eliminated silently.`);
            
            // End turn after stealth kill
            setTimeout(() => Game.endTurn(), 800);
        } else {
            // Regular attack - costs 1 AP
            if (this.actionPoints <= 0) return;
            
            this.actionPoints--;
            const damage = 25;
            const died = enemy.takeDamage(damage, true);
            
            if (died) {
                Effects.createBlood(enemy.x, enemy.y);
                EnemyManager.removeEnemy(enemy.id);
                this.combatKills++;
                showFeedback(`Defeated ${enemy.type}!`);
            } else {
                enemy.alerted = true;
                enemy.state = 'chasing';
                showFeedback(`Attacked ${enemy.type} for ${damage} damage!`);
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
    
    static takeDamage(damage) {
        this.health -= damage;
        showFeedback(`Took ${damage} damage! Health: ${this.health}`);
        
        if (this.health <= 0) {
            Game.gameOver("You have been defeated!");
        }
        
        this.updateCircle();
    }
    
    static resetTurn() {
        this.actionPoints = this.maxActionPoints;
        this.currentAction = null;
        this.moving =