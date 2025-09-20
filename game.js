import nipplejs from 'nipplejs';

class ZombieEscapeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.player = {
            x: 400,
            y: 300,
            size: 30,
            speed: 3,
            health: 100,
            maxHealth: 100,
            color: '#00ff00',
            respawnTimer: 0,
            invulnerable: false,
            weapon: {
                type: 'handgun',
                damage: 25,
                ammo: 30,
                maxAmmo: 30,
                fireRate: 300,
                lastFired: 0
            }
        };
        
        this.zombies = [];
        this.obstacles = [];
        this.particles = [];
        this.bullets = [];
        this.weapons = [];
        this.score = 0;
        this.gameRunning = false;
        
        this.keys = {};
        this.joystick = null;
        this.joystickInput = { x: 0, y: 0 };
        
        this.textures = {
            brick: null,
            wood: null,
            grass: null,
            earth: null,
            player: null,
            zombie: null,
            handgun: null
        };
        
        this.terrain = [];
        this.hills = [];
        this.powerUps = [];
        this.highScore = localStorage.getItem('zombieEscapeHighScore') || 0;
        this.wave = 1;
        this.zombiesPerWave = 5;
        this.zombiesKilledThisWave = 0;
        
        this.init();
    }
    
    async init() {
        await this.loadAssets();
        this.setupEventListeners();
        this.setupMobileControls();
        this.resetGame();
    }
    
    async loadAssets() {
        const texturePromises = Object.keys(this.textures).map(key => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.textures[key] = img;
                    resolve();
                };
                
                const assetMap = {
                    brick: '/ChatGPT Image 20 sep 2025, 19_33_12.png',
                    wood: '/ChatGPT Image 20 sep 2025, 19_33_09.png',
                    grass: '/ChatGPT Image 20 sep 2025, 19_33_21.png',
                    earth: '/ChatGPT Image 20 sep 2025, 19_33_15.png',
                    player: '/ChatGPT Image 20 sep 2025, 19_54_20.png',
                    zombie: '/ChatGPT Image 20 sep 2025, 20_55_29.png',
                    handgun: '/ChatGPT Image 20 sep 2025, 20_59_52 (1).png'
                };
                
                img.src = assetMap[key];
            });
        });
        
        await Promise.all(texturePromises);
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key.toLowerCase() === 'r') {
                this.reload();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (this.gameRunning) {
                this.shoot(e);
            }
        });
        
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.resetGame();
            this.startGame();
        });
    }
    
    setupMobileControls() {
        if (window.innerWidth <= 768) {
            const joystickContainer = document.getElementById('joystickContainer');
            this.joystick = nipplejs.create({
                zone: joystickContainer,
                mode: 'static',
                position: { left: '50%', top: '50%' },
                color: 'red',
                size: 100
            });
            
            this.joystick.on('move', (evt, data) => {
                if (data.vector) {
                    this.joystickInput.x = data.vector.x;
                    this.joystickInput.y = data.vector.y;
                }
            });
            
            this.joystick.on('end', () => {
                this.joystickInput = { x: 0, y: 0 };
            });
        }
    }
    
    startGame() {
        document.getElementById('startScreen').classList.add('hidden');
        this.gameRunning = true;
        this.gameLoop();
        this.spawnZombies();
        this.spawnObstacles();
    }
    
    resetGame() {
        this.player.x = 400;
        this.player.y = 300;
        this.player.health = 100;
        this.zombies = [];
        this.obstacles = [];
        this.particles = [];
        this.bullets = [];
        this.weapons = [];
        this.score = 0;
        this.updateUI();
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        this.updatePlayer();
        this.updateZombies();
        this.updateBullets();
        this.updateParticles();
        this.checkCollisions();
        this.updateScore();
    }
    
    updatePlayer() {
        let dx = 0;
        let dy = 0;
        
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
        
        dx += this.joystickInput.x;
        dy += this.joystickInput.y;
        
        if (dx !== 0 || dy !== 0) {
            const mag = Math.sqrt(dx * dx + dy * dy);
            dx = (dx / mag) * this.player.speed;
            dy = (dy / mag) * this.player.speed;
            
            const newX = this.player.x + dx;
            const newY = this.player.y + dy;
            
            if (newX > this.player.size && newX < this.canvas.width - this.player.size) {
                this.player.x = newX;
            }
            if (newY > this.player.size && newY < this.canvas.height - this.player.size) {
                this.player.y = newY;
            }
        }
    }
    
    updateZombies() {
        this.zombies.forEach((zombie, index) => {
            const dx = this.player.x - zombie.x;
            const dy = this.player.y - zombie.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                zombie.x += (dx / dist) * zombie.speed;
                zombie.y += (dy / dist) * zombie.speed;
            }
            
            if (dist > 1000) {
                this.zombies.splice(index, 1);
            }
        });
        
        if (this.zombies.length < this.zombiesPerWave) {
            this.spawnZombies();
        }
    }
    
    updateBullets() {
        this.bullets = this.bullets.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            
            if (bullet.x < 0 || bullet.x > this.canvas.width || 
                bullet.y < 0 || bullet.y > this.canvas.height) {
                return false;
            }
            
            let hit = false;
            this.zombies.forEach((zombie, zIndex) => {
                const dx = bullet.x - zombie.x;
                const dy = bullet.y - zombie.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < zombie.size + bullet.size) {
                    zombie.health -= bullet.damage;
                    this.createParticles(zombie.x, zombie.y, '#ff0000', 8);
                    hit = true;
                    
                    if (zombie.health <= 0) {
                        this.zombies.splice(zIndex, 1);
                        this.score += 100;
                    }
                }
            });
            
            return !hit;
        });
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            return particle.life > 0;
        });
    }
    
    checkCollisions() {
        // Check weapon pickups
        this.weapons = this.weapons.filter(weapon => {
            const dx = this.player.x - weapon.x;
            const dy = this.player.y - weapon.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < this.player.size + weapon.size) {
                this.player.weapon = {
                    type: 'handgun',
                    damage: 35,
                    ammo: 30,
                    maxAmmo: 30,
                    fireRate: 250,
                    lastFired: 0
                };
                return false;
            }
            return true;
        });
        
        this.zombies.forEach((zombie, zIndex) => {
            const dx = this.player.x - zombie.x;
            const dy = this.player.y - zombie.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < this.player.size + zombie.size) {
                this.player.health -= 10;
                this.createParticles(zombie.x, zombie.y, '#ff0000');
                this.zombies.splice(zIndex, 1);
                
                if (this.player.health <= 0) {
                    this.gameOver();
                }
            }
        });
        
        this.obstacles.forEach(obstacle => {
            if (this.player.x < obstacle.x + obstacle.width &&
                this.player.x + this.player.size > obstacle.x &&
                this.player.y < obstacle.y + obstacle.height &&
                this.player.y + this.player.size > obstacle.y) {
                
                if (this.player.x < obstacle.x) this.player.x = obstacle.x - this.player.size;
                if (this.player.x > obstacle.x) this.player.x = obstacle.x + obstacle.width;
                if (this.player.y < obstacle.y) this.player.y = obstacle.y - this.player.size;
                if (this.player.y > obstacle.y) this.player.y = obstacle.y + obstacle.height;
            }
        });
    }
    
    reload() {
        if (this.player.weapon.ammo < this.player.weapon.maxAmmo) {
            this.player.weapon.ammo = this.player.weapon.maxAmmo;
            this.createParticles(this.player.x, this.player.y, '#00ff00', 5);
        }
    }
    
    shoot(e) {
        const now = Date.now();
        if (now - this.player.weapon.lastFired < this.player.weapon.fireRate) return;
        if (this.player.weapon.ammo <= 0) {
            this.createParticles(this.player.x, this.player.y, '#ff0000', 3);
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const dx = mouseX - this.player.x;
        const dy = mouseY - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const bulletSpeed = 8;
        const vx = (dx / dist) * bulletSpeed;
        const vy = (dy / dist) * bulletSpeed;
        
        this.bullets.push({
            x: this.player.x,
            y: this.player.y,
            vx: vx,
            vy: vy,
            size: 3,
            damage: this.player.weapon.damage
        });
        
        this.player.weapon.ammo--;
        this.player.weapon.lastFired = now;
        
        this.createParticles(this.player.x, this.player.y, '#ffff00', 5);
    }
    
    createParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1,
                color: color
            });
        }
    }
    
    spawnZombies() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0: x = -50; y = Math.random() * this.canvas.height; break;
            case 1: x = this.canvas.width + 50; y = Math.random() * this.canvas.height; break;
            case 2: x = Math.random() * this.canvas.width; y = -50; break;
            case 3: x = Math.random() * this.canvas.width; y = this.canvas.height + 50; break;
        }
        
        this.zombies.push({
            x: x,
            y: y,
            size: 25,
            speed: 0.5 + Math.random() * 0.5,
            color: '#00ff00',
            health: 50
        });
    }
    
    spawnObstacles() {
        for (let i = 0; i < 5; i++) {
            this.obstacles.push({
                x: Math.random() * (this.canvas.width - 100),
                y: Math.random() * (this.canvas.height - 100),
                width: 80,
                height: 80,
                type: ['brick', 'wood', 'earth'][Math.floor(Math.random() * 3)]
            });
        }
        
        // Spawn weapon pickups
        for (let i = 0; i < 2; i++) {
            this.weapons.push({
                x: Math.random() * (this.canvas.width - 50) + 25,
                y: Math.random() * (this.canvas.height - 50) + 25,
                type: 'handgun',
                size: 20
            });
        }
    }
    
    updateScore() {
        this.score += 1;
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('healthValue').textContent = this.player.health;
        document.getElementById('scoreValue').textContent = this.score;
    }
    
    gameOver() {
        this.gameRunning = false;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').classList.remove('hidden');
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawBackground();
        this.drawObstacles();
        this.drawPlayer();
        this.drawZombies();
        this.drawBullets();
        this.drawParticles();
        this.drawWeaponUI();
    }
    
    drawBackground() {
        // Use earth texture for a dirt ground look
        const pattern = this.ctx.createPattern(this.textures.earth, 'repeat');
        this.ctx.fillStyle = pattern;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add subtle grid overlay for visual interest
        this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            let texture;
            switch(obstacle.type) {
                case 'brick': texture = this.textures.brick; break;
                case 'wood': texture = this.textures.wood; break;
                case 'earth': texture = this.textures.earth; break;
            }
            
            const pattern = this.ctx.createPattern(texture, 'repeat');
            this.ctx.fillStyle = pattern;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Add subtle border to obstacles
            this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });
        
        // Draw weapon pickups
        this.weapons.forEach(weapon => {
            this.ctx.drawImage(this.textures.handgun, 
                weapon.x - weapon.size, 
                weapon.y - weapon.size, 
                weapon.size * 2, 
                weapon.size * 2);
        });
    }
    
    drawPlayer() {
        this.ctx.drawImage(this.textures.player, 
            this.player.x - this.player.size, 
            this.player.y - this.player.size, 
            this.player.size * 2, 
            this.player.size * 2);
        
        // Draw held weapon in player's hand
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        this.ctx.rotate(Math.PI / 4); // 45 degree angle
        this.ctx.drawImage(this.textures.handgun, 
            this.player.size - 10, -this.player.size + 5, 
            25, 25);
        this.ctx.restore();
    }
    
    drawZombies() {
        this.zombies.forEach(zombie => {
            this.ctx.drawImage(this.textures.zombie, 
                zombie.x - zombie.size, 
                zombie.y - zombie.size, 
                zombie.size * 2, 
                zombie.size * 2);
        });
    }
    
    drawBullets() {
        this.bullets.forEach(bullet => {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.fillRect(bullet.x - bullet.size, bullet.y - bullet.size, bullet.size * 2, bullet.size * 2);
        });
    }
    
    drawWeaponUI() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, this.canvas.height - 80, 200, 70);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px Courier New';
        this.ctx.fillText(`Ammo: ${this.player.weapon.ammo}/${this.player.weapon.maxAmmo}`, 20, this.canvas.height - 55);
        
        // Draw weapon model
        this.ctx.drawImage(this.textures.handgun, 20, this.canvas.height - 45, 30, 30);
        
        if (this.player.weapon.ammo === 0) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillText('RELOAD (R)', 60, this.canvas.height - 35);
        }
        
        this.ctx.fillStyle = '#0f0';
        this.ctx.font = '12px Courier New';
        this.ctx.fillText('Press R to reload', 20, this.canvas.height - 15);
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
        });
        this.ctx.globalAlpha = 1;
    }
}

new ZombieEscapeGame();
