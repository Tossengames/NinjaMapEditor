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
    static originalPos = null;
    
    static init() {
        // Input handlers for panning and zooming
        const getPos = (e) => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
        
        const start = (e) => {
            if (e.touches && e.touches.length === 2) {
                this.touchDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            } else {
                this.isDragging = true;
                this.lastMouse = getPos(e);
            }
        };
        
        const move = (e) => {
            if (this.isFocusing) return;
            
            if (e.touches && e.touches.length === 2) {
                const curDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
                if (this.touchDist > 0) this.zoom = Math.min(Math.max(0.4, this.zoom * (curDist / this.touchDist)), 4);
                this.touchDist = curDist;
                draw();
            } else if (this.isDragging) {
                const pos = getPos(e);
                this.x += (pos.x - this.lastMouse.x) / this.zoom;
                this.y += (pos.y - this.lastMouse.y) / this.zoom;
                this.lastMouse = pos;
                draw();
            }
        };
        
        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('touchstart', start, {passive: false});
        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', (e) => { if(e.touches.length > 1) e.preventDefault(); move(e); }, {passive: false});
        window.addEventListener('mouseup', () => this.isDragging = false);
        window.addEventListener('touchend', () => { this.isDragging = false; this.touchDist = 0; });
        
        window.addEventListener('wheel', e => {
            if (this.isFocusing) return;
            this.zoom = Math.min(Math.max(0.4, this.zoom * (e.deltaY > 0 ? 0.9 : 1.1)), 4);
            draw();
        }, {passive: false});
    }
    
    static update() {
        // Update camera shake
        if (this.shakeTimer > 0) {
            this.shakeTimer--;
            const shakeX = (Math.random() - 0.5) * this.shakeAmount;
            const shakeY = (Math.random() - 0.5) * this.shakeAmount;
            
            ctx.save();
            ctx.translate(shakeX, shakeY);
        }
        
        // Update camera focus
        if (this.isFocusing && this.focusTarget) {
            const targetX = this.focusTarget.x;
            const targetY = this.focusTarget.y;
            
            // Smoothly move camera toward target
            const targetScreenX = -((targetX * currentMapData.tilesize) - canvas.width/2);
            const targetScreenY = -((targetY * currentMapData.tilesize) - canvas.height/2);
            
            this.x += (targetScreenX - this.x) * 0.1;
            this.y += (targetScreenY - this.y) * 0.1;
            
            // Check if close enough
            if (Math.abs(this.x - targetScreenX) < 5 && Math.abs(this.y - targetScreenY) < 5) {
                this.isFocusing = false;
                this.focusTarget = null;
            }
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
    
    static focusOn(x, y) {
        this.focusTarget = { x, y };
        this.isFocusing = true;
    }
    
    static shake(amount, duration) {
        this.shakeAmount = amount;
        this.shakeTimer = duration / 16; // Convert ms to frames (assuming 60fps)
    }
    
    static reset() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.isDragging = false;
        this.isFocusing = false;
        this.focusTarget = null;
    }
}