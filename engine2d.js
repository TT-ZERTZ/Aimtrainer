
const canvas = document.getElementById('game-canvas-2d');
const ctx = canvas.getContext('2d');
let width, height;

function resize() {
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = width; canvas.height = height;
}
window.addEventListener('resize', resize); resize();

let targets = [];
const TARGET_RADIUS = 30; // Half-width for square
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
    const margin = TARGET_RADIUS * 2;
    const x = margin + Math.random() * (width - margin*2);
    const y = margin + Math.random() * (height - margin*2);
    targets.push({ x, y, r: TARGET_RADIUS });
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
    
    const shape = window.SettingsManager.current.display.targetShape;

    for(let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        if (shape === 'square') {
            if (mx >= t.x - t.r && mx <= t.x + t.r && my >= t.y - t.r && my <= t.y + t.r) {
                hitIndex = i; break;
            }
        } else {
            const dx = mx - t.x; const dy = my - t.y;
            if(Math.sqrt(dx*dx + dy*dy) <= t.r) {
                hitIndex = i; break;
            }
        }
    }
    
    if(hitIndex > -1) {
        targets.splice(hitIndex, 1);
        hits++; score += 100 * combo; combo = Math.min(combo + 1, 10);
        if(combo > maxCombo) maxCombo = combo;
        window.SoundEngine.playHit();
        if(window.SettingsManager.current.display.showHitmarker) {
            hitmarker.classList.add('active');
            setTimeout(() => hitmarker.classList.remove('active'), 100);
        }
        spawnTarget();
    } else {
        misses++; combo = 1; window.SoundEngine.playMiss();
    }
    updateStatsUI();
});

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

        const shape = window.SettingsManager.current.display.targetShape;
        const showHitboxes = window.SettingsManager.current.display.showHitboxes;

        targets.forEach(t => {
            ctx.beginPath();
            if (shape === 'square') {
                ctx.rect(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2);
            } else {
                ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
            }
            ctx.fillStyle = '#00f0ff';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            if (showHitboxes) {
                ctx.beginPath();
                ctx.rect(t.x - t.r - 2, t.y - t.r - 2, (t.r * 2) + 4, (t.r * 2) + 4);
                ctx.strokeStyle = 'rgba(255, 50, 50, 0.9)';
                ctx.lineWidth = 2;
                ctx.stroke();
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
    // Force redraw settings if needed
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
