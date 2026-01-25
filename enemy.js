class Enemy {
    constructor(id, x, y, type = 'guard') {
        this.id = id;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.type = type;
        this.health = type === 'boss' ? 100 : 50;
        this.maxHealth = type === 'boss' ? 100 : 50;
        this.attackDamage = type === 'boss' ? 20 : 10;
        this.visionRange = type === 'boss' ? 5 : 4;
        this.alertRange = 2;
        this.state = 'patrol';
        this.alerted = false;
        this.alertTimer = 0;
        this.patrolPath = [];
        this.currentPatrolIndex = 0;
        this.direction = 0;
        this.lastKnownPlayerPos = null;
        this.feedback = '';
        this.moving = false;
        this.movePath = [];
        this.moveStep = 0;
        this.sleeping = false;
        this.sleepTimer = 0;
        this.poisoned = false;
        this.poisonTimer = 0;
        
        this.initPatrol();
    }
    
    initPatrol() {
        // Create patrol path around starting position
        this.patrolPath = [
            [this.x, this.y],
            [this.x + 1, this.y],
            [this.x + 1, this.y + 1],
            [this.x, this.y + 1]
        ].filter(pos => {
            const [x, y] = pos;
            if (x < 0 || x >= currentMapData.cols || y < 0 || y >= currentMapData.rows) return false;
            const tileIndex = y * currentMapData.cols + x;
            const tileId = currentMapData.grid[tileIndex];
            return TILE_DATA[tileId]?.walkable;
        });
        
        if (this.patrolPath.length === 0) {
            this.patrolPath = [[this.x, this.y]];
        }
    }
    
    canSeePlayer() {
        if (Player.hidden || this.sleeping) return false;
        
        const dx = Player.x - this.x;
        const dy = Player.y - this.y;
        const dist = Math.abs(dx) + Math.abs(dy);
        
        if (dist > this.visionRange) return false;
        
        // Check line of sight
        return this.hasLineOfSight(Player.x, Player.y);
    }
    
    hasLineOfSight(targetX, targetY) {
        const steps = Math.max(Math.abs(targetX - this.x), Math.abs(targetY - this.y));
        
        for (let i = 1; i <= steps; i++) {
            const x = Math.round(this.x + (targetX - this.x) * (i / steps));
            const y = Math.round(this.y + (targetY - this.y) * (i / steps));
            
            // Check if wall
            const tileIndex = y * currentMapData.cols + x;
            const tileId = currentMapData.grid[tileIndex];
            if (tileId === 20) { // Wall
                return false;
            }
        }
        
        return true;
    }
    
    takeTurn() {
        if (this.sleeping) {
            this.sleepTimer--;
            if (this.sleepTimer <= 0) {
                this.sleeping = false;
                this.feedback = "Waking up...";
            } else {
                this.feedback = "Sleeping...";
                return 'sleeping';
            }
        }
        
        if (this.poisoned) {
            this.poisonTimer--;
            if (this.poisonTimer <= 0) {
                this.takeDamage(999, false);
                return 'dead';
            }
        }
        
        if (this.moving) return 'moving';
        
        this.feedback = '';
        
        switch(this.state) {
            case 'patrol':
                this.patrolBehavior();
                break;
            case 'investigating':
                this.investigatingBehavior();
                break;
            case 'chasing':
                this.chasingBehavior();
                break;
            case 'attacking':
                this.attackingBehavior();
                break;
            case 'alerted':
                this.alertedBehavior();
                break;
        }
        
        // Show feedback bubble
        if (this.feedback) {
            Effects.createFeedback(this.x, this.y, this.feedback);
        }
        
        return this.state;
    }
    
    patrolBehavior() {
        // Check for player
        if (this.canSeePlayer()) {
            this.state = 'chasing';
            this.alerted = true;
            this.lastKnownPlayerPos = { x: Player.x, y: Player.y };
            this.feedback = "I see you!";
            Sound.play('alert');
            return;
        }
        
        // Check for items or suspicious things
        const itemsNearby = Items.getItemsInRange(this.x, this.y, 2);
        if (itemsNearby.length > 0 && Math.random() < 0.3) {
            this.state = 'investigating';
            this.lastKnownPlayerPos = { x: itemsNearby[0].x, y: itemsNearby[0].y };
            this.feedback = "What's that?";
            return;
        }
        
        // Move along patrol path
        if (this.patrolPath.length > 1 && !this.moving) {
            const target = this.patrolPath[this.currentPatrolIndex];
            if (this.x === target[0] && this.y === target[1]) {
                this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPath.length;
            }
            
            const nextTarget = this.patrolPath[this.currentPatrolIndex];
            this.moveToward(nextTarget[0], nextTarget[1]);
        }
        
        // Randomly change direction
        if (Math.random() < 0.2) {
            this.direction = Math.floor(Math.random() * 4);
        }
    }
    
    investigatingBehavior() {
        if (!this.lastKnownPlayerPos) {
            this.state = 'patrol';
            return;
        }
        
        // Check if reached investigation point
        if (this.x === this.lastKnownPlayerPos.x && this.y === this.lastKnownPlayerPos.y) {
            this.alertTimer = 2 + Math.floor(Math.random() * 3);
            this.state = 'alerted';
            this.feedback = "Nothing here...";
            return;
        }
        
        // Move toward investigation point
        if (!this.moving) {
            this.moveToward(this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y);
            this.feedback = "Checking it out...";
        }
    }
    
    chasingBehavior() {
        // Check if can still see player
        if (this.canSeePlayer()) {
            this.lastKnownPlayerPos = { x: Player.x, y: Player.y };
            
            // Check if in attack range
            const dist = Math.abs(Player.x - this.x) + Math.abs(Player.y - this.y);
            if (dist <= 1) {
                this.state = 'attacking';
                return;
            }
            
            // Move toward player
            if (!this.moving) {
                this.moveToward(Player.x, Player.y);
                this.feedback = "Get back here!";
            }
        } else {
            // Lost sight of player
            this.state = 'investigating';
            this.feedback = "Where did he go?";
        }
    }
    
    attackingBehavior() {
        const dist = Math.abs(Player.x - this.x) + Math.abs(Player.y - this.y);
        
        if (dist <= 1) {
            // Attack player
            Player.takeDamage(this.attackDamage);
            Effects.showDamageText(Player.x, Player.y, `-${this.attackDamage}`, "#ff0000");
            Sound.play('enemy_attack');
            this.feedback = "Take this!";
        } else {
            // Move toward player
            if (!this.moving) {
                this.moveToward(Player.x, Player.y);
            }
        }
    }
    
    alertedBehavior() {
        this.alertTimer--;
        
        if (this.alertTimer <= 0) {
            this.state = 'patrol';
            this.alerted = false;
            this.feedback = "Back to patrol...";
            return;
        }
        
        // Look around
        this.direction = (this.direction + 1) % 4;
        this.feedback = "On alert...";
    }
    
    moveToward(targetX, targetY) {
        const path = this.findPath(targetX, targetY);
        
        if (path && path.length > 1) {
            const nextStep = path[1];
            this.movePath = [{x: this.x, y: this.y}];
            for (let i = 1; i < path.length && i <= 2; i++) {
                this.movePath.push({x: path[i].x, y: path[i].y});
            }
            this.moving = true;
            this.moveStep = 1;
            this.performMoveStep();
        }
    }
    
    performMoveStep() {
        if (this.moveStep >= this.movePath.length) {
            // Movement complete
            const finalPos = this.movePath[this.movePath.length - 1];
            this.x = finalPos.x;
            this.y = finalPos.y;
            this.moving = false;
            this.movePath = [];
            this.moveStep = 0;
            
            // Update direction based on movement
            if (finalPos.x > this.targetX) this.direction = 0;
            else if (finalPos.y > this.targetY) this.direction = 1;
            else if (finalPos.x < this.targetX) this.direction = 2;
            else if (finalPos.y < this.targetY) this.direction = 3;
            
            this.targetX = this.x;
            this.targetY = this.y;
            
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
    
    findPath(targetX, targetY) {
        // Simple BFS pathfinding
        const queue = [{ x: this.x, y: this.y, path: [] }];
        const visited = new Set();
        visited.add(`${this.x},${this.y}`);
        
        const directions = [
            { dx: 1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: -1 }
        ];
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            if (current.x === targetX && current.y === targetY) {
                return [...current.path, { x: current.x, y: current.y }];
            }
            
            for (const dir of directions) {
                const newX = current.x + dir.dx;
                const newY = current.y + dir.dy;
                const key = `${newX},${newY}`;
                
                if (visited.has(key)) continue;
                if (newX < 0 || newX >= currentMapData.cols || newY < 0 || newY >= currentMapData.rows) continue;
                
                // Check if tile is walkable
                const tileIndex = newY * currentMapData.cols + newX;
                const tileId = currentMapData.grid[tileIndex];
                if (!TILE_DATA[tileId]?.walkable) continue;
                
                // Check if occupied by other enemy
                const occupied = EnemyManager.enemies.some(e => e.id !== this.id && e.x === newX && e.y === newY);
                if (occupied) continue;
                
                visited.add(key);
                queue.push({
                    x: newX,
                    y: newY,
                    path: [...current.path, { x: current.x, y: current.y }]
                });
            }
        }
        
        return null;
    }
    
    takeDamage(damage, fromPlayer = false) {
        this.health -= damage;
        
        if (fromPlayer) {
            this.alerted = true;
            this.state = 'chasing';
        }
        
        if (this.health <= 0) {
            return true; // Enemy died
        }
        
        return false;
    }
    
    draw(ctx, startX, startY, size) {
        const x = startX + this.x * size;
        const y = startY + this.y * size;
        
        // Draw enemy body with state-based color
        let color;
        if (this.sleeping) {
            color = '#5555ff';
        } else if (this.poisoned) {
            color = '#aa00aa';
        } else {
            switch(this.state) {
                case 'chasing':
                case 'attacking':
                    color = '#ff0000';
                    break;
                case 'alerted':
                    color = '#9900ff';
                    break;
                case 'investigating':
                    color = '#ff9900';
                    break;
                default:
                    color = this.type === 'boss' ? '#ff8844' : '#ff4444';
            }
        }
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw vision cone if not sleeping
        if (!this.sleeping) {
            this.drawVisionCone(ctx, x, y, size);
        }
        
        // Draw health bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y - 8, size, 4);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x, y - 8, size * (this.health / this.maxHealth), 4);
        
        // Draw enemy type label
        ctx.fillStyle = 'white';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        const label = this.sleeping ? 'Zzz' : this.type.toUpperCase();
        ctx.fillText(label, x + size/2, y - 12);
    }
    
    drawVisionCone(ctx, x, y, size) {
        if (Game.currentTurn !== 'enemy' || this.sleeping) return;
        
        ctx.save();
        ctx.translate(x + size/2, y + size/2);
        ctx.rotate(this.direction * Math.PI / 2);
        
        const visionColor = this.state === 'chasing' ? 'rgba(255,0,0,0.2)' : 
                          this.state === 'alerted' ? 'rgba(255,0,255,0.2)' : 
                          'rgba(255,255,0,0.1)';
        
        ctx.fillStyle = visionColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        
        // 45-degree cone
        const angle = Math.PI / 4;
        const range = this.visionRange * size;
        
        ctx.lineTo(range * Math.cos(angle), range * Math.sin(-angle));
        ctx.arc(0, 0, range, -angle, angle);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

class EnemyManager {
    static enemies = [];
    static enemyCounter = 0;
    
    static init() {
        this.enemies = [];
        this.enemyCounter = 0;
        
        if (currentMapData && currentMapData.enemies) {
            currentMapData.enemies.forEach(enemyData => {
                this.addEnemy(enemyData.x, enemyData.y, enemyData.type || 'guard');
            });
        }
    }
    
    static addEnemy(x, y, type) {
        const enemy = new Enemy(this.enemyCounter++, x, y, type);
        this.enemies.push(enemy);
        return enemy;
    }
    
    static removeEnemy(id) {
        this.enemies = this.enemies.filter(e => e.id !== id);
    }
    
    static getEnemiesInRange(x, y, range) {
        return this.enemies.filter(enemy => {
            const dist = Math.abs(enemy.x - x) + Math.abs(enemy.y - y);
            return dist <= range;
        });
    }
    
    static async takeTurns() {
        for (const enemy of this.enemies) {
            // Focus camera on enemy
            Camera.smoothFocusOn(enemy.x, enemy.y);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Enemy takes action
            const previousState = enemy.state;
            const action = enemy.takeTurn();
            
            // Wait for movement to complete
            if (enemy.moving) {
                await new Promise(resolve => {
                    const checkMoving = () => {
                        if (!enemy.moving) {
                            resolve();
                        } else {
                            setTimeout(checkMoving, 100);
                        }
                    };
                    checkMoving();
                });
            }
            
            // Small delay between enemies
            await new Promise(resolve => setTimeout(resolve, 500));
            
            draw();
        }
    }
    
    static drawAll(ctx, startX, startY, size) {
        this.enemies.forEach(enemy => {
            enemy.draw(ctx, startX, startY, size);
        });
    }
}