class Items {
    static placedItems = [];
    static itemCounter = 0;
    
    static useItem(itemId) {
        if (Game.currentTurn !== 'player' || Player.actionPoints <= 0) return;
        
        const item = inventory.find(i => i.id === itemId);
        if (!item || item.qty <= 0) return;
        
        // Calculate usable tiles
        const usableTiles = this.getUsableTiles();
        
        if (usableTiles.length === 0) {
            Game.showFeedback("No usable tiles in range!");
            return;
        }
        
        // Highlight usable tiles
        Game.highlightTiles(usableTiles, '#ffff00', 0.3);
        
        // Set up click handler for item placement
        canvas.onclick = (e) => {
            const pos = Camera.screenToWorld(e.clientX, e.clientY);
            const tileX = Math.floor((pos.x + (currentMapData.cols * currentMapData.tilesize) / 2) / currentMapData.tilesize);
            const tileY = Math.floor((pos.y + (currentMapData.rows * currentMapData.tilesize) / 2) / currentMapData.tilesize);
            
            // Check if tile is usable
            const isUsable = usableTiles.some(t => t.x === tileX && t.y === tileY);
            if (isUsable) {
                this.placeItem(item, tileX, tileY);
                canvas.onclick = null;
                Game.clearHighlights();
            }
        };
        
        Game.showFeedback(`Select where to place ${item.name} (Yellow highlights)`);
    }
    
    static getUsableTiles() {
        const tiles = [];
        const range = 3;
        
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                const dist = Math.abs(dx) + Math.abs(dy);
                if (dist > range || dist === 0) continue;
                
                const x = Player.x + dx;
                const y = Player.y + dy;
                
                // Check bounds
                if (x < 0 || x >= currentMapData.cols || y < 0 || y >= currentMapData.rows) continue;
                
                // Check if tile is walkable and empty
                const tileIndex = y * currentMapData.cols + x;
                const tileId = currentMapData.grid[tileIndex];
                const tileInfo = TILE_DATA[tileId];
                
                if (tileInfo && tileInfo.walkable) {
                    // Check if tile has enemy or item
                    const hasEnemy = EnemyManager.enemies.some(e => e.x === x && e.y === y);
                    const hasItem = this.placedItems.some(i => i.x === x && i.y === y);
                    
                    if (!hasEnemy && !hasItem) {
                        tiles.push({ x, y, distance: dist });
                    }
                }
            }
        }
        
        return tiles;
    }
    
    static placeItem(item, x, y) {
        // Remove item from inventory
        const invItem = inventory.find(i => i.id === item.id);
        if (invItem) {
            invItem.qty--;
            if (invItem.qty <= 0) {
                inventory = inventory.filter(i => i.id !== item.id);
            }
        }
        
        Player.actionPoints--;
        Player.itemsUsed++;
        
        // Create placed item
        const placedItem = {
            id: this.itemCounter++,
            type: item.id,
            name: item.name,
            icon: item.icon,
            effect: item.effect,
            x: x,
            y: y,
            turnsLeft: this.getEffectDuration(item.effect),
            active: false,
            range: this.getEffectRange(item.effect)
        };
        
        this.placedItems.push(placedItem);
        
        // Show placement effect
        Effects.createPlacement(x, y, item.icon);
        Sound.play('item_place');
        Game.showFeedback(`${item.name} placed at (${x}, ${y})`);
        
        // Update toolbar
        updateToolbar();
        
        // If no action points left, end turn
        if (Player.actionPoints <= 0) {
            setTimeout(() => Game.endTurn(), 500);
        }
        
        draw();
    }
    
    static getEffectDuration(effect) {
        switch(effect) {
            case 'bomb': return 1 + Math.floor(Math.random() * 3);
            case 'gas': return 1;
            case 'trap': return 999; // Permanent until triggered
            case 'rice': return 4 + Math.floor(Math.random() * 3);
            default: return 0;
        }
    }
    
    static getEffectRange(effect) {
        switch(effect) {
            case 'bomb': return 2;
            case 'gas': return 1;
            case 'trap': return 0; // Only affects the tile it's on
            case 'rice': return 2; // Attraction range
            default: return 1;
        }
    }
    
    static checkTileForItems(x, y) {
        // Check if player stepped on trap
        const trap = this.placedItems.find(i => i.type === 'trap' && i.x === x && i.y === y);
        if (trap && !trap.active) {
            trap.active = true;
            Player.takeDamage(30);
            Effects.createExplosion(x, y, 1);
            Sound.play('trap_trigger');
            Game.showFeedback("Stepped on a trap!");
        }
    }
    
    static updateItems() {
        // Update active items
        for (let i = this.placedItems.length - 1; i >= 0; i--) {
            const item = this.placedItems[i];
            
            if (item.active) {
                // Already activated items disappear
                this.placedItems.splice(i, 1);
                continue;
            }
            
            item.turnsLeft--;
            
            if (item.turnsLeft <= 0) {
                this.activateItem(item);
                this.placedItems.splice(i, 1);
            }
        }
        
        // Check enemy interactions
        this.checkEnemyInteractions();
    }
    
    static activateItem(item) {
        item.active = true;
        
        switch(item.type) {
            case 'bomb':
                this.activateBomb(item);
                break;
            case 'gas':
                this.activateGas(item);
                break;
            case 'rice':
                this.activateRice(item);
                break;
        }
    }
    
    static activateBomb(item) {
        Effects.createExplosion(item.x, item.y, item.range);
        Sound.play('explosion');
        Camera.shake(10, 500);
        
        // Damage enemies in range
        const enemies = EnemyManager.getEnemiesInRange(item.x, item.y, item.range);
        enemies.forEach(enemy => {
            if (enemy.takeDamage(50)) {
                Game.showFeedback(`${enemy.type} killed by explosion!`);
            } else {
                enemy.alerted = true;
                enemy.state = 'alerted';
                enemy.alertTimer = 3;
                enemy.feedback = "What was that?!";
            }
        });
        
        // Alert other enemies
        const allEnemies = EnemyManager.enemies.filter(e => !enemies.includes(e));
        allEnemies.forEach(enemy => {
            const dist = Math.abs(enemy.x - item.x) + Math.abs(enemy.y - item.y);
            if (dist <= item.range + 3) {
                enemy.alerted = true;
                enemy.state = 'alerted';
                enemy.alertTimer = 2;
                enemy.lastKnownPlayerPos = { x: item.x, y: item.y };
            }
        });
        
        Game.showFeedback("Bomb exploded!");
    }
    
    static activateGas(item) {
        Effects.createGasCloud(item.x, item.y, item.range);
        Sound.play('gas_release');
        
        // Put enemies to sleep
        const enemies = EnemyManager.getEnemiesInRange(item.x, item.y, item.range);
        enemies.forEach(enemy => {
            enemy.alerted = false;
            enemy.state = 'patrol';
            enemy.feedback = "Feeling sleepy...";
            
            // Mark as sleeping (special state for easy stealth kills)
            enemy.sleeping = true;
            enemy.sleepTimer = 2 + Math.floor(Math.random() * 4);
        });
        
        Game.showFeedback("Sleep gas released!");
    }
    
    static activateRice(item) {
        Effects.createParticles(item.x, item.y, '🍙', 10);
        Sound.play('item_place');
        
        // Attract enemies
        const enemies = EnemyManager.getEnemiesInRange(item.x, item.y, item.range);
        enemies.forEach(enemy => {
            enemy.lastKnownPlayerPos = { x: item.x, y: item.y };
            enemy.state = 'investigating';
            enemy.feedback = "What's that smell?";
        });
        
        Game.showFeedback("Rice ball placed!");
    }
    
    static checkEnemyInteractions() {
        this.placedItems.forEach(item => {
            if (item.type === 'trap') {
                // Check if enemy stepped on trap
                const enemies = EnemyManager.getEnemiesInRange(item.x, item.y, 0);
                enemies.forEach(enemy => {
                    if (!item.active) {
                        item.active = true;
                        if (enemy.takeDamage(999)) {
                            Effects.createBlood(enemy.x, enemy.y);
                            Sound.play('trap_trigger');
                            Game.showFeedback(`${enemy.type} killed by trap!`);
                            EnemyManager.removeEnemy(enemy.id);
                        }
                    }
                });
            }
            
            if (item.type === 'rice' && !item.active) {
                // Check if enemy reached rice
                const enemies = EnemyManager.getEnemiesInRange(item.x, item.y, 0);
                enemies.forEach(enemy => {
                    if (enemy.x === item.x && enemy.y === item.y) {
                        // Enemy eats poisoned rice
                        item.active = true;
                        enemy.feedback = "Yummy rice...";
                        enemy.poisoned = true;
                        enemy.poisonTimer = 2 + Math.floor(Math.random() * 3);
                    }
                });
            }
        });
        
        // Check poisoned enemies
        EnemyManager.enemies.forEach(enemy => {
            if (enemy.poisoned) {
                enemy.poisonTimer--;
                if (enemy.poisonTimer <= 0) {
                    if (enemy.takeDamage(999)) {
                        Effects.createBlood(enemy.x, enemy.y);
                        Game.showFeedback(`${enemy.type} died from poisoning!`);
                        EnemyManager.removeEnemy(enemy.id);
                    }
                }
            }
        });
    }
    
    static getItemsInRange(x, y, range) {
        return this.placedItems.filter(item => {
            const dist = Math.abs(item.x - x) + Math.abs(item.y - y);
            return dist <= range && !item.active;
        });
    }
    
    static drawAll(ctx, startX, startY, size) {
        this.placedItems.forEach(item => {
            if (item.active) return;
            
            const x = startX + item.x * size;
            const y = startY + item.y * size;
            
            // Draw item
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(item.icon, x + size/2, y + size/2);
            
            // Draw timer for bombs
            if (item.type === 'bomb' && item.turnsLeft > 0) {
                ctx.font = '10px Arial';
                ctx.fillStyle = '#ff0000';
                ctx.fillText(item.turnsLeft.toString(), x + size/2, y + size/2 + 15);
            }
        });
    }
}