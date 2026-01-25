class Camera {
    static x = 0;
    static y = 0;
    static zoom = 1;
    static isDragging = false;
    static lastMouse = { x: 0, y: 0 };
    static touchDist = 0;
    static shakeAmount = 0;
    static shakeTimer = 0;
    static isFocusing = false;
    static focusTarget = null;
    static originalPos = { x: 0, y: 0 };
    static returnTimer = null;
    static userInteracted = false;
    
    static init() {
        this.reset();
        
        // Only attach events to canvas, not toolbar
        const getPos = (e) => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
        
        const start = (e) => {
            // Check if click is on toolbar
            const toolbar = document.getElementById('toolbar');
            if (toolbar && toolbar.contains(e.target)) {
                return; // Don't handle camera on toolbar clicks
            }
            
            this.userInteracted = true;
            this.cancelReturnToFocus();
            
            if (e.touches && e.touches.length === 2) {
                this.touchDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            } else {
                this.isDragging = true;
                this.lastMouse = getPos(e);
            }
        };
        
        const move = (e) => {
            if (!this.isDragging && !(e.touches && e.touches.length === 2)) return;
            
            if (e.touches && e.touches.length === 2) {
                const curDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
                if (this.touchDist > 0) {
                    const newZoom = Math.min(Math.max(0.4, this.zoom * (curDist / this.touchDist)), 4);
                    if (newZoom !== this.zoom) {
                        this.userInteracted = true;
                        this.cancelReturnToFocus();
                    }
                    this.zoom = newZoom;
                }
                this.touchDist = curDist;
                draw();
            } else if (this.isDragging) {
                const pos = getPos(e);
                const dx = (pos.x - this.lastMouse.x) / this.zoom;
                const dy = (pos.y - this.lastMouse.y) / this.zoom;
                
                if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                    this.userInteracted = true;
                    this.cancelReturnToFocus();
                }
                
                this.x += dx;
                this.y += dy;
                this.lastMouse = pos;
                draw();
            }
        };
        
        const end = () => {
            this.isDragging = false;
            this.touchDist = 0;
            
            // If user was interacting, start timer to return to focus
            if (this.userInteracted && this.isFocusing && this.focusTarget) {
                this.startReturnToFocus();
            }
        };
        
        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('touchstart', start, {passive: false});
        canvas.addEventListener('mousemove', move);
        canvas.addEventListener('touchmove', (e) => { 
            if(e.touches.length > 1) e.preventDefault(); 
            move(e); 
        }, {passive: false});
        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
        
        canvas.addEventListener('wheel', e => {
            this.userInteracted = true;
            this.cancelReturnToFocus();
            
            const newZoom = Math.min(Math.max(0.4, this.zoom * (e.deltaY > 0 ? 0.9 : 1.1)), 4);
            if (newZoom !== this.zoom) {
                this.zoom = newZoom;
                draw();
            }
            
            e.preventDefault();
        }, {passive: false});
    }
    
    static update() {
        // Update camera shake
        if (this.shakeTimer > 0) {
            this.shakeTimer--;
        }
        
        // Update camera focus if not user-interacted
        if (this.isFocusing && this.focusTarget && !this.userInteracted) {
            this.smoothFocus();
        }
    }
    
    static smoothFocus() {
        if (!this.focusTarget || !currentMapData) return;
        
        const targetX = this.focusTarget.x;
        const targetY = this.focusTarget.y;
        const size = currentMapData.tilesize;
        
        // Calculate target camera position (center on tile)
        const targetCamX = -((targetX * size) - canvas.width / (2 * this.zoom));
        const targetCamY = -((targetY * size) - canvas.height / (2 * this.zoom));
        
        // Smooth interpolation
        const speed = 0.1;
        this.x += (targetCamX - this.x) * speed;
        this.y += (targetCamY - this.y) * speed;
        
        // Check if close enough
        if (Math.abs(this.x - targetCamX) < 1 && Math.abs(this.y - targetCamY) < 1) {
            this.x = targetCamX;
            this.y = targetCamY;
        }
        
        draw();
    }
    
    static smoothFocusOn(x, y) {
        this.focusTarget = { x, y };
        this.isFocusing = true;
        this.userInteracted = false;
        this.cancelReturnToFocus();
    }
    
    static startReturnToFocus() {
        this.cancelReturnToFocus();
        this.returnTimer = setTimeout(() => {
            this.userInteracted = false;
        }, 2000);
    }
    
    static cancelReturnToFocus() {
        if (this.returnTimer) {
            clearTimeout(this.returnTimer);
            this.returnTimer = null;
        }
    }
    
    static applyTransform() {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(this.x, this.y);
        
        // Apply shake
        if (this.shakeTimer > 0) {
            const shakeX = (Math.random() - 0.5) * this.shakeAmount;
            const shakeY = (Math.random() - 0.5) * this.shakeAmount;
            ctx.translate(shakeX, shakeY);
        }
    }
    
    static restoreTransform() {
        ctx.restore();
    }
    
    static screenToWorld(screenX, screenY) {
        const rect = canvas.getBoundingClientRect();
        const x = screenX - rect.left;
        const y = screenY - rect.top;
        
        const worldX = (x - canvas.width/2) / this.zoom - this.x;
        const worldY = (y - canvas.height/2) / this.zoom - this.y;
        
        return { x: worldX, y: worldY };
    }
    
    static worldToTile(worldX, worldY) {
        if (!currentMapData) return null;
        
        const size = currentMapData.tilesize;
        const startX = -(currentMapData.cols * size) / 2;
        const startY = -(currentMapData.rows * size) / 2;
        
        const tileX = Math.floor((worldX - startX) / size);
        const tileY = Math.floor((worldY - startY) / size);
        
        // Check bounds
        if (tileX < 0 || tileX >= currentMapData.cols || 
            tileY < 0 || tileY >= currentMapData.rows) {
            return null;
        }
        
        return { tileX, tileY };
    }
    
    static shake(amount, duration) {
        this.shakeAmount = amount;
        this.shakeTimer = duration / 16;
    }
    
    static reset() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.isDragging = false;
        this.isFocusing = false;
        this.focusTarget = null;
        this.userInteracted = false;
        this.cancelReturnToFocus();
        
        // Center on player if game has started
        if (currentMapData && Game.gameActive) {
            const size = currentMapData.tilesize;
            this.x = -((Player.x * size) - canvas.width/2);
            this.y = -((Player.y * size) - canvas.height/2);
            this.smoothFocusOn(Player.x, Player.y);
        }
    }
}