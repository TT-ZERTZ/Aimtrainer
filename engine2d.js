
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'grid'; 

const canvas = document.getElementById('game-canvas-2d');
const ctx = canvas.getContext('2d');
let width, height;
let cellSize, startX, startY;

const titleEl = document.getElementById('pause-title');
if (titleEl) { titleEl.innerText = mode === 'tracking' ? '2D Tracking Ready' : '2D Gridshot Ready'; }

function resize() {
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = width; canvas.height = height;
    
    // Scale possibox based on Level Designer settings
    const scale = window.SettingsManager.current.arena.scale / 100;
    cellSize = Math.min(width, height) * 0.08 * scale; 
    startX = width/2 - (cellSize * 4);
    startY = height/2 - (cellSize * 4);
}
window.addEventListener('resize', resize); 

let targets = [];
const MAX_TARGETS = mode === 'tracking' ? 1 : 3;
let score = 0, hits = 0, misses = 0, combo = 1, maxCombo = 0;
let timeLeft = 60.0;
let lastTime = 0;
let isPlaying = false;
let isHolding = false;

const uiScore = document.getElementById('score-display');
const uiTime = document.getElementById('time-display');
const uiAcc = document.getElementById('acc-display');
const uiCombo = document.getElementById('combo-display');
const hitmarker = document.getElementById('hitmarker');
if(mode === 'tracking' && document.getElementById('combo-container')) {
    document.getElementById('combo-container').style.display = 'none'; // hide combo in tracking
}

const crosshairDOM = document.getElementById('game-crosshair');
let mouseX = width/2, mouseY = height/2;
document.addEventListener('mousemove', (e) => {
    if(!isPlaying) return;
    mouseX = e.clientX; mouseY = e.clientY;
    crosshairDOM.style.left = `${mouseX}px`; crosshairDOM.style.top = `${mouseY}px`;
    crosshairDOM.style.transform = `translate(-50%, -50%)`;
});

document.addEventListener('mousedown', (e) => { if(e.button===0) isHolding = true; });
document.addEventListener('mouseup', (e) => { if(e.button===0) isHolding = false; });

function spawnTarget() {
    const ts = window.SettingsManager.current.target;
    let col, row, x, y;
    
    if (mode === 'grid') {
        let validSpot = false;
        while(!validSpot) {
            col = Math.floor(Math.random() * 8);
            row = Math.floor(Math.random() * 8);
            validSpot = true;
            for(let t of targets) { if(t.col === col && t.row === row) { validSpot = false; break; } }
        }
        x = startX + (col * cellSize) + (cellSize / 2);
        y = startY + (row * cellSize) + (cellSize / 2);
    } else {
        // Tracking spawns in center initially
        x = width/2; y = height/2;
    }
    
    const r = (cellSize / 2) * 0.8 * (ts.size / 100);
    targets.push({ x, y, r, col, row, vx: 0, vy: 0, timer: 0 });
}

function updateStatsUI() {
    uiScore.innerText = score;
    uiAcc.innerText = (hits + misses === 0) ? 100 : Math.round((hits / (hits + misses)) * 100);
    if(mode === 'grid') uiCombo.innerText = `x${combo}`;
}

canvas.addEventListener('mousedown', (e) => {
    if(!isPlaying || mode === 'tracking') return; // click handling only for gridshot
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

        drawPossiBox(ctx);
        const ts = window.SettingsManager.current.target;

        if (mode === 'tracking' && targets.length > 0) {
            let t = targets[0];
            t.timer -= dt;
            if(t.timer <= 0) {
                 t.vx = (Math.random() - 0.5) * 600 * (window.SettingsManager.current.arena.scale/100); 
                 t.vy = (Math.random() - 0.5) * 600 * (window.SettingsManager.current.arena.scale/100);
                 t.timer = 0.3 + Math.random() * 0.5;
            }
            t.x += t.vx * dt; t.y += t.vy * dt;
            
            if(t.x > startX + 8*cellSize) { t.x = startX + 8*cellSize; t.vx *= -1; }
            if(t.x < startX) { t.x = startX; t.vx *= -1; }
            if(t.y > startY + 8*cellSize) { t.y = startY + 8*cellSize; t.vy *= -1; }
            if(t.y < startY) { t.y = startY; t.vy *= -1; }

            let hit = false;
            if (ts.shape === 'square') {
                if (mouseX >= t.x - t.r && mouseX <= t.x + t.r && mouseY >= t.y - t.r && mouseY <= t.y + t.r) hit = true;
            } else {
                const dx = mouseX - t.x; const dy = mouseY - t.y;
                if(Math.sqrt(dx*dx + dy*dy) <= t.r) hit = true;
            }
            
            if(isHolding && hit) {
                score += Math.round(500 * dt);
                t.isHit = true;
                hits++; // tracking hit frames
            } else if (isHolding && !hit) {
                misses++;
                t.isHit = false;
            } else {
                t.isHit = false;
            }
            updateStatsUI();
        }

        targets.forEach(t => {
            const r = t.r;
            ctx.fillStyle = (mode==='tracking' && t.isHit) ? '#ffffff' : ts.color;
            ctx.beginPath();
            if (ts.shape === 'square') { ctx.rect(t.x - r, t.y - r, r * 2, r * 2); } 
            else { ctx.arc(t.x, t.y, r, 0, Math.PI * 2); }
            ctx.fill();

            if (ts.pattern === 'grid') {
                ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(1, r * 0.15);
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
    resize(); // ensure possibox scaling is active
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
    resize();
    if(!isPlaying && targets.length > 0) {
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
resize(); requestAnimationFrame(gameLoop);
