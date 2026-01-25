class Effects {
    static particles = [];
    static feedbacks = [];
    static damageTexts = [];
    
    static init() {
        // Try to load sprites
        this.loadSprites();
        
        // Try to load sounds
        Sound.init();
    }
    
    static loadSprites() {
        // Try to load sprites from GitHub repository
        const spritePaths = [
            'sprites/tiles.png',
            'sprites/characters.png',
            'sprites/items.png',
            'sprites/effects.png'
        ];
        
        // This would be implemented with actual image loading
        // For now, we'll use placeholders
    }
    
    static createBlood(x, y) {
        // Create blood particles
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x + Math.random() - 0.5,
                y: y + Math.random() - 0.5,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 30 + Math.random() * 30,
                color: '#990000',
                size: 2 + Math.random() * 3
            });
        }
    }
    
    static createExplosion(x, y, radius) {
        // Create explosion particles
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 20 + Math.random() * 20,
                color: '#ff9900',
                size: 3 + Math.random() * 4
            });
        }
        
        // Create shockwave effect
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            life: 30,
            color: '#ff3300',
            size: 0,
            growing: true,
            maxSize: radius * currentMapData.tilesize
        });
    }
    
    static createGasCloud(x, y, radius) {
        // Create gas cloud particles
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * radius,
                y: y + (Math.random() - 0.5) * radius,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                life: 60 + Math.random() * 60,
                color: '#00ffaa',
                size: 4 + Math.random() * 3,
                opacity: 0.3
            });
        }
    }
    
    static createPlacement(x, y, icon) {
        // Create placement effect particles
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1,
                life: 20 + Math.random() * 20,
                text: icon,
                size: 12 + Math.random() * 6,
                color: '#ffffff'
            });
        }
    }
    
    static createParticles(x, y, text, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 30 + Math.random() * 30,
                text: text,
                size: 10 + Math.random() * 6,
                color: '#ffffff'
            });
        }
    }
    
    static createFeedback(x, y, text) {
        const feedback = {
            x: x,
            y: y,
            text: text,
            life: 120, // 2 seconds at 60fps
            offset: 0
        };
        
        this.feedbacks.push(feedback);
    }
    
    static showDamageText(x, y, text, color) {
        const damageText = {
            x: x,
            y: y,
            text: text,
            color: color,
            life: 60, // 1 second
            offset: 0,
            vy: -0.5
        };
        
        this.damageTexts.push(damageText);
    }
    
    static update() {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.offset = (p.life / 100);
            
            if (p.growing && p.size < p.maxSize) {
                p.size += 2;
            }
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update feedbacks
        for (let i = this.feedbacks.length - 1; i >= 0; i--) {
            const f = this.feedbacks[i];
            f.life--;
            f.offset += 0.5;
            
            if (f.life <= 0) {
                this.feedbacks.splice(i, 1);
            }
        }
        
        // Update damage texts
        for (let i = this.damageTexts.length - 1; i >= 0; i--) {
            const dt = this.damageTexts[i];
            dt.life--;
            dt.offset += dt.vy;
            
            if (dt.life <= 0) {
                this.damageTexts.splice(i, 1);
            }
        }
    }
    
    static drawAll(ctx, startX, startY, size) {
        // Draw particles
        this.particles.forEach(p => {
            const screenX = startX + p.x * size;
            const screenY = startY + p.y * size;
            
            if (p.text) {
                // Text particle
                ctx.globalAlpha = p.offset;
                ctx.font = `${p.size}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = p.color;
                ctx.fillText(p.text, screenX, screenY);
                ctx.globalAlpha = 1;
            } else {
                // Circle particle
                ctx.globalAlpha = p.opacity || p.offset;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        });
        
        // Draw feedback bubbles
        this.feedbacks.forEach(f => {
            const screenX = startX + f.x * size + size/2;
            const screenY = startY + f.y * size - f.offset;
            
            ctx.fillStyle = 'rgba(20,20,20,0.9)';
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            
            // Draw bubble
            ctx.beginPath();
            ctx.roundRect(screenX - 50, screenY - 20, 100, 25, 8);
            ctx.fill();
            ctx.stroke();
            
            // Draw text
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(f.text, screenX, screenY - 8);
        });
        
        // Draw damage texts
        this.damageTexts.forEach(dt => {
            const screenX = startX + dt.x * size + size/2;
            const screenY = startY + dt.y * size - dt.offset;
            
            ctx.fillStyle = dt.color;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dt.text, screenX, screenY);
        });
    }
}

class Sound {
    static sounds = {};
    static enabled = true;
    
    static init() {
        // Try to load sounds from GitHub repository
        const soundPaths = {
            'attack': 'sfx/attack.wav',
            'stealth_kill': 'sfx/stealth_kill.wav',
            'enemy_attack': 'sfx/enemy_attack.wav',
            'item_place': 'sfx/item_place.wav',
            'explosion': 'sfx/explosion.wav',
            'gas_release': 'sfx/gas_release.wav',
            'trap_trigger': 'sfx/trap_trigger.wav'
        };
        
        // In a real implementation, we would load these files
        // For now, we'll just create placeholder audio contexts if available
        if (window.AudioContext || window.webkitAudioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                this.enabled = false;
            }
        } else {
            this.enabled = false;
        }
    }
    
    static play(soundName) {
        if (!this.enabled) return;
        
        // In a real implementation, play the loaded sound
        // For now, we'll just log it
        console.log(`Playing sound: ${soundName}`);
        
        // Create a simple beep for demonstration
        if (this.audioContext) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Different frequencies for different sounds
            let frequency = 440;
            switch(soundName) {
                case 'attack': frequency = 600; break;
                case 'stealth_kill': frequency = 300; break;
                case 'explosion': frequency = 100; break;
            }
            
            oscillator.frequency.value = frequency;
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
        }
    }
}

// Add roundRect support if not available
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}