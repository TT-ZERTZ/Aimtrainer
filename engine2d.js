
const canvas = document.getElementById('game-canvas-2d');
const ctx = canvas.getContext('2d');
let width, height;

// Resize
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// Game State
let targets = [];
const TARGET_RADIUS = 30;
const MAX_TARGETS = 3;

let score = 0, hits = 0, misses = 0, combo = 1, maxCombo = 0;
let timeLeft = 60.0;
let lastTime = 0;
let isPlaying = false;

// UI Elements
const uiScore = document.getElementById('score-display');
const uiTime = document.getElementById('time-display');
const uiAcc = document.getElementById('acc-display');
const uiCombo = document.getElementById('combo-display');
const hitmarker = document.getElementById('hitmarker');

// Track Mouse for custom crosshair positioning (2D only)
const crosshairDOM = document.getElementById('game-crosshair');
let mouseX = width/2, mouseY = height/2;
document.addEventListener('mousemove', (e) => {
    if(!isPlaying) return;
    mouseX = e.clientX; mouseY = e.clientY;
    crosshairDOM.style.left = `${mouseX}px`;
    crosshairDOM.style.top = `${mouseY}px`;
    crosshairDOM.style.transform = `translate(-50%, -50%)`; // override default centering
});

function spawnTarget() {
    const margin = TARGET_RADIUS * 2;
    const x = margin + Math.random() * (width - margin*2);
    const y = margin + Math.random() * (height - margin*2);
    targets.push({ x, y, r: TARGET_RADIUS, life: 1.0 });
}

function updateStatsUI() {
    uiScore.innerText = score;
    const acc = (hits + misses === 0) ? 100 : Math.round((hits / (hits + misses)) * 100);
    uiAcc.innerText = acc;
    uiCombo.innerText = `x${combo}`;
}

function showHitmarker() {
    if(!window.SettingsManager.current.display.showHitmarker) return;
    hitmarker.classList.add('active');
    setTimeout(() => hitmarker.classList.remove('active'), 100);
}

// Click Handling
canvas.addEventListener('mousedown', (e) => {
    if(!isPlaying) return;
    
    // Play with standard mouse coords
    const mx = e.clientX;
    const my = e.clientY;
    
    let hitIndex = -1;
    // Check collision (reverse order to hit top target)
    for(let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        const dx = mx - t.x;
        const dy = my - t.y;
        if(Math.sqrt(dx*dx + dy*dy) <= t.r) {
            hitIndex = i;
            break;
        }
    }
    
    if(hitIndex > -1) {
        // Hit
        targets.splice(hitIndex, 1);
        hits++;
        score += 100 * combo;
        combo = Math.min(combo + 1, 10); // max 10x
        if(combo > maxCombo) maxCombo = combo;
        
        window.SoundEngine.playHit();
        showHitmarker();
        spawnTarget(); // Respawn instantly
    } else {
        // Miss
        misses++;
        combo = 1;
        window.SoundEngine.playMiss();
    }
    updateStatsUI();
});

// Main Loop
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (isPlaying) {
        // Timer
        timeLeft -= dt;
        if (timeLeft <= 0) {
            timeLeft = 0;
            endGame();
        }
        uiTime.innerText = timeLeft.toFixed(1);

        // Draw Background
        ctx.fillStyle = '#1a1b26';
        ctx.fillRect(0, 0, width, height);

        // Draw Targets
        targets.forEach(t => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
            ctx.fillStyle = '#00f0ff';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        });
    }

    requestAnimationFrame(gameLoop);
}

function startGame() {
    score = 0; hits = 0; misses = 0; combo = 1; maxCombo = 0;
    timeLeft = 60.0;
    targets = [];
    for(let i=0; i<MAX_TARGETS; i++) spawnTarget();
    updateStatsUI();
    
    // Hide native cursor, let DOM crosshair take over
    document.body.style.cursor = 'none';
    crosshairDOM.style.display = 'block';
}

function endGame() {
    isPlaying = false;
    document.body.style.cursor = 'default';
    crosshairDOM.style.display = 'none';
    const acc = (hits + misses === 0) ? 100 : Math.round((hits / (hits + misses)) * 100);
    gameController.showResults({ score, acc, hits, misses, maxCombo });
}

// Init Controller
const gameController = new GameController(
    () => { /* start prep */ startGame(); },
    () => { 
        isPlaying = false; 
        document.body.style.cursor = 'default';
        crosshairDOM.style.display = 'none';
    },
    () => { 
        if(timeLeft > 0) {
            isPlaying = true; lastTime = performance.now(); 
            document.body.style.cursor = 'none';
            crosshairDOM.style.display = 'block';
        } else {
            startGame();
            isPlaying = true; lastTime = performance.now();
        }
    }
);

// Start Loop
requestAnimationFrame(gameLoop);
