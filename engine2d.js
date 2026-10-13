
const canvas = document.getElementById('game-canvas-2d');
const ctx = canvas.getContext('2d');
let width, height;
let cellSize, startX, startY;

function resize() {
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = width; canvas.height = height;
    
    // Setup 8x8 tight possibox grid for 2D mode
    cellSize = Math.min(width, height) * 0.08; 
    startX = width/2 - (cellSize * 4);
    startY = height/2 - (cellSize * 4);
}
window.addEventListener('resize', resize); resize();

let targets = [];
const MAX_TARGETS = 3;
let score = 0, hits = 0, misses = 0, combo = 1, maxCombo = 0;
let timeLeft = 60.0;
let lastTime = 0;
let isPlaying = false;

const uiScore = document.getElementById('score-display');
const uiTime = document.getElementById('time-display');
const uiAcc = document.getElementById('acc-display');
const uiCombo = document.getElementById('combo-display');
const hitmarker = document.getElementById('hitmarker');

const crosshairDOM = document.getElementById('game-crosshair');
let mouseX = width/2, mouseY = height/2;
document.addEventListener('mousemove', (e) => {
    if(!isPlaying) return;
    mouseX = e.clientX; mouseY = e.clientY;
    crosshairDOM.style.left = `${mouseX}px`; crosshairDOM.style.top = `${mouseY}px`;
    crosshairDOM.style.transform = `translate(-50%, -50%)`;
});

function spawnTarget() {
    const ts = window.SettingsManager.current.target;
    let validSpot = false;
    let col, row;
    
    while(!validSpot) {
        col = Math.floor(Math.random() * 8);
        row = Math.floor(Math.random() * 8);
        validSpot = true;
        for(let t of targets) { if(t.col === col && t.row === row) { validSpot = false; break; } }
    }
    
    // Calculate display radius based on setting size %
    const r = (cellSize / 2) * 0.8 * (ts.size / 100);
    const x = startX + (col * cellSize) + (cellSize / 2);
    const y = startY + (row * cellSize) + (cellSize / 2);
    
    targets.push({ x, y, r, col, row });
}

function updateStatsUI() {
    uiScore.innerText = score;
    uiAcc.innerText = (hits + misses === 0) ? 100 : Math.round((hits / (hits + misses)) * 100);
    uiCombo.innerText = `x${combo}`;
}

canvas.addEventListener('mousedown', (e) => {
    if(!isPlaying) return;
    const mx = e.clientX; const my = e.clientY;
    let hitIndex = -1;
    
    const shape = window.SettingsManager.current.target.shape;

    for(let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        if (shape === 'square') {
            if (mx >= t.x - t.r && mx <= t.x + t.r && my >= t.y - t.r && my <= t.y + t.r) { hitIndex = i; break; }
        } else {
            const dx = mx - t.x; const dy = my - t.y;
            if(Math.sqrt(dx*dx + dy*dy) <= t.r) { hitIndex = i; break; }
        }
    }
    
    if(hitIndex > -1) {
        targets.splice(hitIndex, 1);
        hits++; score += 100 * combo; combo = Math.min(combo + 1, 10);
        if(combo > maxCombo) maxCombo = combo;
        window.SoundEngine.playHit();
        if(window.SettingsManager.current.display.showHitmarker) {
            hitmarker.classList.add('active'); setTimeout(() => hitmarker.classList.remove('active'), 100);
        }
        spawnTarget();
    } else {
        misses++; combo = 1; window.SoundEngine.playMiss();
    }
    updateStatsUI();
});

function drawPossiBox(ctx) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for(let i=0; i<=8; i++) {
        ctx.beginPath(); ctx.moveTo(startX + i*cellSize, startY); ctx.lineTo(startX + i*cellSize, startY + 8*cellSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(startX, startY + i*cellSize); ctx.lineTo(startX + 8*cellSize, startY + i*cellSize); ctx.stroke();
    }
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (isPlaying) {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; endGame(); }
        uiTime.innerText = timeLeft.toFixed(1);

        ctx.fillStyle = '#1a1b26';
        ctx.fillRect(0, 0, width, height);

        // Draw the visual possibility box 8x8 grid
        drawPossiBox(ctx);

        const ts = window.SettingsManager.current.target;

        targets.forEach(t => {
            const r = t.r;
            ctx.fillStyle = ts.color;
            ctx.beginPath();
            if (ts.shape === 'square') { ctx.rect(t.x - r, t.y - r, r * 2, r * 2); } 
            else { ctx.arc(t.x, t.y, r, 0, Math.PI * 2); }
            ctx.fill();

            // Apply 'Grid' design
            if (ts.pattern === 'grid') {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = Math.max(1, r * 0.15);
                if (ts.shape === 'square') {
                    ctx.strokeRect(t.x - r, t.y - r, r*2, r*2);
                    ctx.beginPath(); ctx.moveTo(t.x, t.y - r); ctx.lineTo(t.x, t.y + r); ctx.moveTo(t.x - r, t.y); ctx.lineTo(t.x + r, t.y); ctx.stroke();
                } else {
                    ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI*2); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(t.x, t.y - r); ctx.lineTo(t.x, t.y + r); ctx.moveTo(t.x - r, t.y); ctx.lineTo(t.x + r, t.y); ctx.stroke();
                }
            }

            if (ts.showHitboxes) {
                ctx.beginPath(); ctx.rect(t.x - r - 2, t.y - r - 2, (r * 2) + 4, (r * 2) + 4);
                ctx.strokeStyle = 'rgba(255, 50, 50, 0.9)'; ctx.lineWidth = 2; ctx.stroke();
            }
        });
    }
    requestAnimationFrame(gameLoop);
}

function startGame() {
    score = 0; hits = 0; misses = 0; combo = 1; maxCombo = 0;
    timeLeft = 60.0; targets = [];
    for(let i=0; i<MAX_TARGETS; i++) spawnTarget();
    updateStatsUI();
    document.body.style.cursor = 'none'; crosshairDOM.style.display = 'block';
}

function endGame() {
    isPlaying = false;
    document.body.style.cursor = 'default'; crosshairDOM.style.display = 'none';
    const acc = (hits + misses === 0) ? 100 : Math.round((hits / (hits + misses)) * 100);
    gameController.showResults({ score, acc, hits, misses, maxCombo });
}

window.addEventListener('settingsUpdated', () => {
    if(!isPlaying && targets.length > 0) {
        // Redraw sizes instantly if paused
        const ts = window.SettingsManager.current.target;
        targets.forEach(t => t.r = (cellSize / 2) * 0.8 * (ts.size / 100));
    }
});

const gameController = new GameController(
    () => { startGame(); },
    () => { isPlaying = false; document.body.style.cursor = 'default'; crosshairDOM.style.display = 'none'; },
    () => { 
        if(timeLeft <= 0) startGame();
        isPlaying = true; lastTime = performance.now(); 
        document.body.style.cursor = 'none'; crosshairDOM.style.display = 'block';
    }
);
requestAnimationFrame(gameLoop);
