
let scene, camera, renderer, raycaster;
let targets = [];
let targetMaterial = null; 
let possiBoxHelper = null;

let score = 0, hits = 0, misses = 0;
let timeLeft = 60.0;
let lastTime = performance.now();
let isPlaying = false;

// Determine Mode
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'grid'; 

const uiScore = document.getElementById('score-display');
const uiTime = document.getElementById('time-display');
const uiAcc = document.getElementById('acc-display');
const hitmarker = document.getElementById('hitmarker');
const titleEl = document.getElementById('pause-title');

if (titleEl) { titleEl.innerText = mode === '360' ? '3D 360° Flick Ready' : '3D Gridshot Ready'; }

let isLocked = false;
document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === document.body;
    if (!isLocked && isPlaying) gameController.pause();
});

// Create Texture for "Grid" Pattern Targets
function getTargetMaterial(ts) {
    let matArgs = { color: ts.color, emissive: 0x000000, shininess: 80 };
    
    if (ts.pattern === 'grid') {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const ctx = c.getContext('2d');
        ctx.fillStyle = ts.color; ctx.fillRect(0,0,128,128);
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 12;
        ctx.strokeRect(0,0,128,128);
        ctx.beginPath(); ctx.moveTo(64,0); ctx.lineTo(64,128); ctx.moveTo(0,64); ctx.lineTo(128,64); ctx.stroke();
        
        const tex = new THREE.CanvasTexture(c);
        matArgs.map = tex;
        matArgs.color = 0xffffff; // Reset base color so texture color shows perfectly
    }
    
    return new THREE.MeshPhongMaterial(matArgs);
}

function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c0d14');
    scene.fog = new THREE.Fog('#0c0d14', 10, 100);

    camera = new THREE.PerspectiveCamera(window.SettingsManager.current.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 5;

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas-3d'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Floor grid
    scene.add(new THREE.GridHelper(100, 50, 0x00f0ff, 0x222222));
    
    raycaster = new THREE.Raycaster();
    
    buildPossiBox();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    let euler = new THREE.Euler(0, 0, 0, 'YXZ');
    document.addEventListener('mousemove', (e) => {
        if (!isLocked || !isPlaying) return;
        const sens = 0.002 * window.SettingsManager.current.sens;
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= e.movementX * sens;
        euler.x -= e.movementY * sens;
        euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, euler.x));
        camera.quaternion.setFromEuler(euler);
    });

    document.addEventListener('mousedown', (e) => {
        if (!isLocked || !isPlaying || e.button !== 0) return;
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(targets);
        
        if (intersects.length > 0) {
            let hitObj = intersects[0].object;
            if(hitObj.type === 'LineSegments') hitObj = hitObj.parent;
            
            scene.remove(hitObj);
            targets = targets.filter(t => t !== hitObj);
            
            hits++; score += 100; window.SoundEngine.playHit();
            if(window.SettingsManager.current.display.showHitmarker) {
                hitmarker.classList.add('active'); setTimeout(() => hitmarker.classList.remove('active'), 100);
            }
            spawnTarget3D();
        } else {
            misses++; window.SoundEngine.playMiss();
        }
        updateStatsUI();
    });

    window.addEventListener('settingsUpdated', (e) => {
        camera.fov = e.detail.fov;
        camera.updateProjectionMatrix();
        
        targetMaterial = getTargetMaterial(e.detail.target);
        
        if (isPlaying || timeLeft > 0) {
            targets.forEach(t => scene.remove(t));
            targets = [];
            for(let i=0; i<3; i++) spawnTarget3D();
        }
    });
    
    targetMaterial = getTargetMaterial(window.SettingsManager.current.target);
}

function buildPossiBox() {
    if(mode !== 'grid') return;
    if(possiBoxHelper) scene.remove(possiBoxHelper);
    
    // Tightened box math
    const spacing = 2.4;
    const wallDist = 20; 
    
    possiBoxHelper = new THREE.GridHelper(spacing * 8, 8, 0x444444, 0x222222);
    possiBoxHelper.rotation.x = Math.PI / 2;
    // Align exactly with target spawn centers. Y=5 is eye level.
    possiBoxHelper.position.set(0, 5, -wallDist - 0.1); 
    scene.add(possiBoxHelper);
}

function spawnTarget3D() {
    const ts = window.SettingsManager.current.target;
    // Calculate radius based on custom size %
    const r = 1.0 * (ts.size / 100);

    let geometry;
    if (ts.shape === 'square') geometry = new THREE.BoxGeometry(r*2, r*2, r*2);
    else geometry = new THREE.SphereGeometry(r, 32, 32);

    const mesh = new THREE.Mesh(geometry, targetMaterial);
    
    if (ts.showHitboxes) {
        const hbGeo = new THREE.BoxGeometry(r*2.1, r*2.1, r*2.1);
        const edges = new THREE.EdgesGeometry(hbGeo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff0000 }));
        mesh.add(line);
    }
    
    if (mode === '360') {
        const dist = 15 + Math.random() * 20;
        const angleX = Math.random() * Math.PI * 2; 
        const angleY = (Math.random() - 0.2) * Math.PI * 0.5; 
        
        mesh.position.x = Math.sin(angleX) * dist;
        mesh.position.y = 5 + Math.sin(angleY) * dist;
        mesh.position.z = -Math.cos(angleX) * dist;
        if (ts.shape === 'square') mesh.lookAt(camera.position); 
    } else {
        // Tight 8x8 Grid Mode
        const cols = 8; const rows = 8;
        const spacing = 2.4; 
        const wallDist = 20; 
        
        let validSpot = false; let col = 0, row = 0; let attempts = 0;
        
        while(!validSpot && attempts < 50) {
            col = Math.floor(Math.random() * cols);
            row = Math.floor(Math.random() * rows);
            validSpot = true;
            
            const testX = (col - 3.5) * spacing;
            const testY = 5 + (row - 3.5) * spacing;
            
            for(let t of targets) {
                if (Math.abs(t.position.x - testX) < 0.1 && Math.abs(t.position.y - testY) < 0.1) {
                    validSpot = false; break;
                }
            }
            attempts++;
        }
        
        mesh.position.x = (col - 3.5) * spacing;
        mesh.position.y = 5 + (row - 3.5) * spacing; 
        mesh.position.z = -wallDist;
        mesh.rotation.set(0, 0, 0); 
    }

    scene.add(mesh);
    targets.push(mesh);
}

function updateStatsUI() {
    uiScore.innerText = score;
    uiAcc.innerText = (hits + misses === 0) ? 100 : Math.round((hits / (hits + misses)) * 100);
}

function startGame3D() {
    score = 0; hits = 0; misses = 0; timeLeft = 60.0;
    targets.forEach(t => scene.remove(t)); targets = [];
    for(let i=0; i<3; i++) spawnTarget3D();
    updateStatsUI();
}

function endGame3D() {
    isPlaying = false; document.exitPointerLock();
    const acc = (hits + misses === 0) ? 100 : Math.round((hits / (hits + misses)) * 100);
    gameController.showResults({ score, acc, hits, misses, maxCombo: 0 });
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    if (isPlaying && isLocked) {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; endGame3D(); }
        uiTime.innerText = timeLeft.toFixed(1);
    }
    renderer.render(scene, camera);
}

const gameController = new GameController(
    () => { startGame3D(); },
    () => { isPlaying = false; document.exitPointerLock(); },
    () => { 
        document.body.requestPointerLock();
        if(timeLeft <= 0) startGame3D();
        isPlaying = true; lastTime = performance.now();
    }
);

init3D(); animate();
