class Effects {
    static particles = [];
    static feedbacks = [];
    static damageTexts = [];
    static spritesLoaded = false;
    static spriteImages = {};
    
    static init() {
        // Try to load sprites
        this.loadSprites();
        
        // Try to load sounds
        Sound.init();
    }
    
    static loadSprites() {
        // Try to load sprites from GitHub repository
        const spritePaths = {
            'tiles': 'sprites/tiles.png',
            'characters': 'sprites/characters.png',
            'items': 'sprites/items.png',
            'effects': 'sprites/effects.png'
        };
        
        // Track loading progress
        let loadedCount = 0;
        const totalCount = Object.keys(spritePaths).length;
        
        Object.entries(spritePaths).forEach(([name, path]) => {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                this.spriteImages[name] = img;
                console.log(`Loaded sprite: ${name}`);
                
                if (loadedCount === totalCount) {
                    this.spritesLoaded = true;
                    console.log('All sprites loaded successfully');
                }
            };
            img.onerror = () => {
                loadedCount++;
                console.log(`Failed to load sprite: ${name}, using placeholders`);
                
                if (loadedCount === totalCount) {
                    this.spritesLoaded = false;
                    console.log('Using placeholder graphics');
                }
            };
            img.src = path;
        });
        
        // If no sprites folder exists, we'll use placeholders
        if (totalCount === 0) {
            this.spritesLoaded = false;
        }
    }
    
    static createBlood(x, y) {
        // Create blood particles
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;
            const life = 40 + Math.random() * 40;
            
            this.particles.push({
                x: x + (Math.random() - 0.5) * 0.3,
                y: y + (Math.random() - 0.5) * 0.3,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                maxLife: life,
                color: '#990000',
                size: 1.5 + Math.random() * 2.5,
                type: 'blood'
            });
        }
        
        // Create blood stain on ground
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            life: 999, // Permanent stain
            maxLife: 999,
            color: '#660000',
            size: 1.5,
            type: 'stain',
            growing: true,
            maxSize: 0.8
        });
        
        Sound.play('blood');
    }
    
    static createExplosion(x, y, radius) {
        // Create explosion particles
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 25 + Math.random() * 25,
                maxLife: 50,
                color: i % 3 === 0 ? '#ff9900' : i % 3 === 1 ? '#ff3300' : '#ffff00',
                size: 3 + Math.random() * 5,
                type: 'explosion'
            });
        }
        
        // Create shockwave effect
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            life: 30,
            maxLife: 30,
            color: '#ff6600',
            size: 0,
            type: 'shockwave',
            growing: true,
            maxSize: radius * 1.5
        });
        
        // Create smoke
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 0.5,
                y: y + (Math.random() - 0.5) * 0.5,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -Math.random() * 0.5,
                life: 60 + Math.random() * 60,
                maxLife: 120,
                color: '#333333',
                size: 2 + Math.random() * 4,
                type: 'smoke',
                opacity: 0.4 + Math.random() * 0.3
            });
        }
        
        Sound.play('explosion');
        Camera.shake(15, 600);
    }
    
    static createGasCloud(x, y, radius) {
        // Create gas cloud particles
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * radius * 0.8,
                y: y + (Math.random() - 0.5) * radius * 0.8,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                life: 80 + Math.random() * 80,
                maxLife: 160,
                color: '#00ffaa',
                size: 3 + Math.random() * 4,
                type: 'gas',
                opacity: 0.2 + Math.random() * 0.2
            });
        }
        
        // Create expanding gas ring
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            life: 40,
            maxLife: 40,
            color: '#00ffaa',
            size: 0,
            type: 'gas_ring',
            growing: true,
            maxSize: radius,
            opacity: 0.3
        });
        
        Sound.play('gas_release');
        Camera.shake(3, 300);
    }
    
    static createPlacement(x, y, icon) {
        // Create placement effect particles
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.3 + Math.random() * 0.7;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 25 + Math.random() * 25,
                maxLife: 50,
                text: icon,
                size: 14 + Math.random() * 8,
                color: '#ffffff',
                type: 'placement'
            });
        }
        
        // Create ripple effect
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            life: 30,
            maxLife: 30,
            color: '#00ff00',
            size: 0,
            type: 'ripple',
            growing: true,
            maxSize: 1.5,
            opacity: 0.5
        });
        
        Sound.play('item_place');
    }
    
    static createParticles(x, y, text, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 40 + Math.random() * 40,
                maxLife: 80,
                text: text,
                size: 12 + Math.random() * 8,
                color: '#ffffff',
                type: 'text_particle'
            });
        }
    }
    
    static createFeedback(x, y, text) {
        const feedback = {
            x: x,
            y: y,
            text: text,
            life: 120, // 2 seconds at 60fps
            maxLife: 120,
            offset: 0,
            type: 'feedback'
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
            maxLife: 60,
            offset: 0,
            vy: -0.8,
            type: 'damage'
        };
        
        this.damageTexts.push(damageText);
    }
    
    static createStealthEffect(x, y) {
        // Create stealth kill effect
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 1.5,
                vy: Math.sin(angle) * 1.5,
                life: 30,
                maxLife: 30,
                color: '#ffffff',
                size: 2 + Math.random() * 3,
                type: 'stealth_ring'
            });
        }
        
        // Create center flash
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            life: 20,
            maxLife: 20,
            color: '#ffffff',
            size: 0,
            type: 'flash',
            growing: true,
            maxSize: 2,
            opacity: 0.8
        });
        
        Sound.play('stealth_kill');
        Camera.shake(8, 400);
    }
    
    static createSleepEffect(x, y) {
        // Create ZZZ sleep effect
        for (let i = 0; i < 3; i++) {
            this.damageTexts.push({
                x: x,
                y: y - i * 0.3,
                text: 'Zzz',
                color: '#00aaff',
                life: 80 + i * 20,
                maxLife: 100,
                offset: 0,
                vy: -0.2,
                type: 'sleep'
            });
        }
        
        Sound.play('sleep');
    }
    
    static update() {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update position
            p.x += p.vx * 0.1;
            p.y += p.vy * 0.1;
            
            // Update life
            p.life--;
            
            // Calculate fade (for smooth disappearance)
            p.opacity = p.life / p.maxLife;
            
            // Handle growing particles
            if (p.growing && p.size < p.maxSize) {
                p.size += 0.1;
            } else if (p.growing && p.size >= p.maxSize) {
                p.growing = false;
            }
            
            // Handle shrinking at end of life
            if (p.life < p.maxLife * 0.3 && !p.growing) {
                p.size *= 0.95;
            }
            
            // Apply gravity to some particles
            if (p.type === 'blood' || p.type === 'explosion') {
                p.vy += 0.05;
            }
            
            // Remove dead particles
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
            
            // Fade out at end
            if (dt.life < dt.maxLife * 0.3) {
                dt.offset += dt.vy * 0.5; // Slow down
            }
            
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
            const drawSize = p.size * (size / 32); // Scale based on tile size
            
            ctx.save();
            
            if (p.type === 'stain' || p.type === 'gas' || p.type === 'smoke') {
                // Semi-transparent particles
                ctx.globalAlpha = (p.opacity || 1) * (p.life / p.maxLife);
            } else {
                // Normal particles with fade
                ctx.globalAlpha = p.opacity || 1;
            }
            
            if (p.text) {
                // Text particle
                ctx.font = `${drawSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = p.color;
                ctx.fillText(p.text, screenX, screenY);
            } else {
                // Shape particle
                ctx.fillStyle = p.color;
                
                switch(p.type) {
                    case 'shockwave':
                    case 'gas_ring':
                    case 'ripple':
                        // Circle outline
                        ctx.beginPath();
                        ctx.arc(screenX, screenY, drawSize, 0, Math.PI * 2);
                        ctx.strokeStyle = p.color;
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        break;
                        
                    case 'flash':
                        // Solid circle
                        ctx.beginPath();
                        ctx.arc(screenX, screenY, drawSize, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                        
                    case 'stealth_ring':
                        // Small dots
                        ctx.beginPath();
                        ctx.arc(screenX, screenY, drawSize / 2, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                        
                    default:
                        // Regular circle
                        ctx.beginPath();
                        ctx.arc(screenX, screenY, drawSize, 0, Math.PI * 2);
                        ctx.fill();
                }
            }
            
            ctx.restore();
        });
        
        // Draw feedback bubbles
        this.feedbacks.forEach(f => {
            const screenX = startX + f.x * size + size/2;
            const screenY = startY + f.y * size - f.offset;
            const alpha = f.life / f.maxLife;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            
            // Draw bubble background
            ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            
            // Draw speech bubble with tail
            const bubbleWidth = Math.min(f.text.length * 6, 120);
            const bubbleHeight = 25;
            
            ctx.beginPath();
            ctx.roundRect(screenX - bubbleWidth/2, screenY - bubbleHeight, bubbleWidth, bubbleHeight, 6);
            ctx.fill();
            ctx.stroke();
            
            // Draw tail
            ctx.beginPath();
            ctx.moveTo(screenX, screenY - 5);
            ctx.lineTo(screenX + 8, screenY);
            ctx.lineTo(screenX - 8, screenY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Draw text
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(f.text, screenX, screenY - bubbleHeight/2 - 5);
            
            ctx.restore();
        });
        
        // Draw damage texts
        this.damageTexts.forEach(dt => {
            const screenX = startX + dt.x * size + size/2;
            const screenY = startY + dt.y * size - dt.offset;
            const alpha = dt.life / dt.maxLife;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            
            // Add shadow for better readability
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            // Draw text based on type
            if (dt.type === 'sleep') {
                ctx.fillStyle = dt.color;
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(dt.text, screenX, screenY);
            } else {
                // Damage numbers
                ctx.fillStyle = dt.color;
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(dt.text, screenX, screenY);
            }
            
            ctx.restore();
        });
    }
    
    static clearAll() {
        this.particles = [];
        this.feedbacks = [];
        this.damageTexts = [];
    }
}

class Sound {
    static sounds = {};
    static enabled = true;
    static audioContext = null;
    static masterVolume = 0.5;
    
    static init() {
        // Check if Web Audio API is available
        if (window.AudioContext || window.webkitAudioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('Web Audio API initialized');
            } catch (e) {
                console.log('Web Audio API not available:', e);
                this.enabled = false;
            }
        } else {
            console.log('Web Audio API not supported');
            this.enabled = false;
        }
        
        // Try to load sounds from GitHub repository
        const soundPaths = {
            'attack': 'sfx/attack.wav',
            'stealth_kill': 'sfx/stealth_kill.wav',
            'enemy_attack': 'sfx/enemy_attack.wav',
            'item_place': 'sfx/item_place.wav',
            'explosion': 'sfx/explosion.wav',
            'gas_release': 'sfx/gas_release.wav',
            'trap_trigger': 'sfx/trap_trigger.wav',
            'blood': 'sfx/blood.wav',
            'sleep': 'sfx/sleep.wav',
            'alert': 'sfx/alert.wav',
            'move': 'sfx/move.wav'
        };
        
        // In a real implementation, we would preload these files
        // For now, we'll generate sounds programmatically if files aren't found
        console.log('Sound system ready (using procedural audio)');
    }
    
    static play(soundName) {
        if (!this.enabled || !this.audioContext) return;
        
        try {
            switch(soundName) {
                case 'attack':
                    this.playSwordSwing();
                    break;
                case 'stealth_kill':
                    this.playStealthKill();
                    break;
                case 'enemy_attack':
                    this.playEnemyAttack();
                    break;
                case 'explosion':
                    this.playExplosion();
                    break;
                case 'gas_release':
                    this.playGasRelease();
                    break;
                case 'trap_trigger':
                    this.playTrapTrigger();
                    break;
                case 'blood':
                    this.playBloodSplash();
                    break;
                case 'item_place':
                    this.playItemPlace();
                    break;
                case 'sleep':
                    this.playSleepSound();
                    break;
                case 'alert':
                    this.playAlert();
                    break;
                case 'move':
                    this.playMove();
                    break;
                default:
                    // Default beep
                    this.playBeep(440, 0.1);
            }
        } catch (e) {
            console.log('Error playing sound:', soundName, e);
        }
    }
    
    static playBeep(frequency, duration) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        gainNode.gain.value = this.masterVolume * 0.3;
        
        // Fade out to avoid clicks
        gainNode.gain.setValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    static playSwordSwing() {
        // Sword swing sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.2, this.audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    
    static playStealthKill() {
        // Quick, sharp sound for stealth kill
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.15, this.audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }
    
    static playExplosion() {
        // Explosion sound with noise
        const duration = 0.8;
        
        // Create noise for explosion
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + duration);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        noise.start();
        noise.stop(this.audioContext.currentTime + duration);
        
        // Add a low boom
        setTimeout(() => {
            this.playBeep(60, 0.3);
        }, 50);
    }
    
    static playGasRelease() {
        // Hissing gas sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.1, this.audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
    
    static playTrapTrigger() {
        // Sharp, mechanical sound
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator1.type = 'square';
        oscillator2.type = 'sawtooth';
        
        oscillator1.frequency.setValueAtTime(600, this.audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.1);
        
        oscillator2.frequency.setValueAtTime(900, this.audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.15, this.audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
        
        oscillator1.start();
        oscillator2.start();
        oscillator1.stop(this.audioContext.currentTime + 0.1);
        oscillator2.stop(this.audioContext.currentTime + 0.1);
    }
    
    static playBloodSplash() {
        // Wet, splattering sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.1, this.audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    
    static playItemPlace() {
        // Soft placement sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.08, this.audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }
    
    static playSleepSound() {
        // Soft, sleepy sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.05, this.audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
    
    static playAlert() {
        // Alert sound for enemies
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.1, this.audioContext.currentTime + 0.05);
        gainNode.gain.setValueAtTime(this.masterVolume * 0.1, this.audioContext.currentTime + 0.25);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
    
    static playMove() {
        // Soft footstep sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.05, this.audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
    
    static playEnemyAttack() {
        // Enemy attack sound (deeper than player)
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.25);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.15, this.audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.25);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.25);
    }
    
    static setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
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

// Global draw function for the canvas
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
            // Use sprite if available, otherwise use color
            if (Effects.spritesLoaded && Effects.spriteImages['tiles']) {
                // In a real implementation, we'd draw sprite segments
                ctx.fillStyle = tileInfo.color;
                ctx.fillRect(x, y, size, size);
            } else {
                ctx.fillStyle = tileInfo.color;
                ctx.fillRect(x, y, size, size);
                
                // Add texture for certain tiles
                if (id === 50) { // Grass
                    ctx.fillStyle = 'rgba(0, 100, 0, 0.3)';
                    for (let j = 0; j < 5; j++) {
                        const bladeX = x + Math.random() * size;
                        const bladeY = y + Math.random() * size;
                        ctx.fillRect(bladeX, bladeY, 1, 3);
                    }
                } else if (id === 70) { // Dark/shadow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.fillRect(x, y, size, size);
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
    
// Global draw function
function draw() {
    if (!currentMapData) {
        console.log("No currentMapData for drawing");
        return;
    }
    
    const gameScreen = document.getElementById('game-screen');
    if (!gameScreen || gameScreen.classList.contains('hidden')) {
        return;
    }
    
    if (!canvas || !ctx) {
        console.error("Canvas or context not available");
        return;
    }
    
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
            ctx.fillStyle = tileInfo.color;
            ctx.fillRect(x, y, size, size);
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

// Make sure draw is available globally
window.draw = draw;
}