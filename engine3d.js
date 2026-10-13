let scene, camera, renderer, raycaster;
let targets = [];
let targetMaterial = null; 
let possiBoxHelper = null;
let gunGroup = null;
const gunBasePos = new THREE.Vector3(0.6, -0.4, -1.2);

let score = 0, hits = 0, misses = 0;
let timeLeft = 60.0;
let lastTime = performance.now();
let isPlaying = false;
let isHolding = false;

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'grid'; 
const MAX_TARGETS = mode === 'tracking' ? 4 : 3;

const uiScore = document.getElementById('score-display');
const uiTime = document.getElementById('time-display');
const uiAcc = document.getElementById('acc-display');
const hitmarker = document.getElementById('hitmarker');
const titleEl = document.getElementById('pause-title');

if (titleEl) { 
    if(mode === '360') titleEl.innerText = '3D 360° Flick Ready';
    else if(mode === 'tracking') titleEl.innerText = '3D Popcorn Tracking Ready';
    else titleEl.innerText = '3D Gridshot Ready'; 
}

if(mode === 'tracking' && document.getElementById('combo-container')) {
    document.getElementById('combo-container').style.display = 'none';
}

let isLocked = false;
document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === document.body;
    if (!isLocked && isPlaying) gameController.pause();
});

document.addEventListener('mousedown', (e) => { if(e.button===0) isHolding = true; });
document.addEventListener('mouseup', (e) => { if(e.button===0) isHolding = false; });

function getTargetMaterial(ts, highlight=false) {
    let colorHex = highlight ? 0xffffff : ts.color;
    let matArgs = { color: colorHex, emissive: highlight ? 0x444444 : 0x000000, shininess: 80 };
    
    if (ts.pattern === 'grid' && !highlight) {
        const c = document.createElement('canvas'); c.width = 128; c.height = 128;
        const ctx = c.getContext('2d');
        ctx.fillStyle = ts.color; ctx.fillRect(0,0,128,128);
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 12; ctx.strokeRect(0,0,128,128);
        ctx.beginPath(); ctx.moveTo(64,0); ctx.lineTo(64,128); ctx.moveTo(0,64); ctx.lineTo(128,64); ctx.stroke();
        const tex = new THREE.CanvasTexture(c); matArgs.map = tex; matArgs.color = 0xffffff;
    }
    return new THREE.MeshPhongMaterial(matArgs);
}

function buildGunModel() {
    if(gunGroup) camera.remove(gunGroup);
    if(!window.SettingsManager.current.arena.showGun) return;

    gunGroup = new THREE.Group();
    const matGray = new THREE.MeshPhongMaterial({ color: 0x333333, flatShading: true });
    const matDark = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true });
    const matNeon = new THREE.MeshPhongMaterial({ color: 0x00f0ff, emissive: 0x0055aa });

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.6), matGray);
    barrel.position.set(0, 0.1, -0.1);
    
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.15), matDark);
    grip.position.set(0, -0.1, 0.1); grip.rotation.x = Math.PI / 8;
    
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.4), matDark);
    rail.position.set(0, 0.18, -0.1);
    
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.4), matNeon);
    stripe.position.set(0.08, 0.1, -0.1);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.4), matNeon);
    stripe2.position.set(-0.08, 0.1, -0.1);

    gunGroup.add(barrel, grip, rail, stripe, stripe2);
    gunGroup.position.copy(gunBasePos);
    camera.add(gunGroup);
}

function triggerRecoil() {
    if(!gunGroup) return;
    gunGroup.position.z += 0.15;
    gunGroup.rotation.x += 0.1;
}

function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c0d14');
    scene.fog = new THREE.Fog('#0c0d14', 10, 100);

    camera = new THREE.PerspectiveCamera(window.SettingsManager.current.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 5;
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas-3d'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10); scene.add(dirLight);

    scene.add(new THREE.GridHelper(100, 50, 0x00f0ff, 0x222222));
    raycaster = new THREE.Raycaster();
    
    buildPossiBox(); buildGunModel();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
    });

    let euler = new THREE.Euler(0, 0, 0, 'YXZ');
    document.addEventListener('mousemove', (e) => {
        if (!isLocked || !isPlaying) return;
        const sens = 0.002 * window.SettingsManager.current.sens;
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= e.movementX * sens; euler.x -= e.movementY * sens;
        euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, euler.x));
        camera.quaternion.setFromEuler(euler);
    });

    document.addEventListener('mousedown', (e) => {
        if (!isLocked || !isPlaying || e.button !== 0 || mode === 'tracking') return;
        triggerRecoil();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(targets);
        
        if (intersects.length > 0) {
            let hitObj = intersects[0].object;
            if(hitObj.type === 'LineSegments') hitObj = hitObj.parent;
            
            scene.remove(hitObj); targets = targets.filter(t => t !== hitObj);
            
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
        camera.fov = e.detail.fov; camera.updateProjectionMatrix();
        targetMaterial = getTargetMaterial(e.detail.target);
        buildPossiBox(); buildGunModel();
        
        if (isPlaying || timeLeft > 0) {
            targets.forEach(t => scene.remove(t)); targets = [];
            for(let i=0; i<MAX_TARGETS; i++) spawnTarget3D();
        }
    });
    
    targetMaterial = getTargetMaterial(window.SettingsManager.current.target);
}

function buildPossiBox() {
    if(mode === '360') return;
    if(possiBoxHelper) scene.remove(possiBoxHelper);
    
    const arenaSet = window.SettingsManager.current.arena;
    const spacing = 2.4 * (arenaSet.scale / 100);
    const wallDist = arenaSet.distance; 
    
    possiBoxHelper = new THREE.GridHelper(spacing * 8, 8, 0x444444, 0x222222);
    possiBoxHelper.rotation.x = Math.PI / 2;
    possiBoxHelper.position.set(0, 5, -wallDist - 0.1); 
    scene.add(possiBoxHelper);
}

function spawnTarget3D() {
    const ts = window.SettingsManager.current.target;
    const arenaSet = window.SettingsManager.current.arena;
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
    
    const wallDist = arenaSet.distance;
    const spacing = 2.4 * (arenaSet.scale / 100);
    const halfXY = spacing * 4;

    if (mode === 'tracking') {
        mesh.position.set((Math.random() - 0.5) * halfXY, 5 - halfXY*0.5, -wallDist);
        mesh.vx = (Math.random() - 0.5) * 12;
        mesh.vy = 12 + Math.random() * 10;
        mesh.vz = 0;
    } else if (mode === '360') {
        const dist = wallDist;
        const angleX = Math.random() * Math.PI * 2; 
        const angleY = (Math.random() - 0.2) * Math.PI * 0.5; 
        mesh.position.x = Math.sin(angleX) * dist;
        mesh.position.y = 5 + Math.sin(angleY) * dist;
        mesh.position.z = -Math.cos(angleX) * dist;
        mesh.vx = 0; mesh.vy = 0; mesh.vz = 0;
        if (ts.shape === 'square') mesh.lookAt(camera.position); 
    } else {
        const cols = 8; const rows = 8;
        let validSpot = false; let col = 0, row = 0; let attempts = 0;
        while(!validSpot && attempts < 50) {
            col = Math.floor(Math.random() * cols); row = Math.floor(Math.random() * rows);
            validSpot = true;
            const testX = (col - 3.5) * spacing; const testY = 5 + (row - 3.5) * spacing;
            for(let t of targets) {
                if (Math.abs(t.position.x - testX) < 0.1 && Math.abs(t.position.y - testY) < 0.1) { validSpot = false; break; }
            }
            attempts++;
        }
        mesh.position.x = (col - 3.5) * spacing;
        mesh.position.y = 5 + (row - 3.5) * spacing; 
        mesh.position.z = -wallDist;
        mesh.rotation.set(0, 0, 0); 
        mesh.vx = 0; mesh.vy = 0; mesh.vz = 0;
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
    for(let i=0; i<MAX_TARGETS; i++) spawnTarget3D();
    updateStatsUI();
}

function endGame3D() {
    isPlaying = false; document.exitPointerLock();
    document.body.style.cursor = 'default';
    const acc = (hits + misses === 0) ? 100 : Math.round((hits / (hits + misses)) * 100);
    gameController.showResults({ score, acc, hits, misses, maxCombo: 0 });
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now(); const dt = (time - lastTime) / 1000; lastTime = time;

    if (isPlaying && isLocked) {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; endGame3D(); }
        uiTime.innerText = timeLeft.toFixed(1);

        if (mode === 'tracking') {
            const arenaSet = window.SettingsManager.current.arena;
            const gravity = arenaSet.gravity / 50; 
            const spacing = 2.4 * (arenaSet.scale / 100);
            const halfXY = spacing * 4;
            const wallDist = arenaSet.distance;

            let anyHit = false;
            targets.forEach(t => {
                t.vy -= gravity * dt;
                t.position.x += t.vx * dt;
                t.position.y += t.vy * dt;

                if (t.position.x > halfXY) { t.position.x = halfXY; t.vx *= -0.85; }
                if (t.position.x < -halfXY) { t.position.x = -halfXY; t.vx *= -0.85; }
                if (t.position.y > 5 + halfXY) { t.position.y = 5 + halfXY; t.vy *= -0.85; }
                if (t.position.y < 5 - halfXY) {
                    t.position.y = 5 - halfXY;
                    t.vy = Math.abs(t.vy) * 0.85 + (6 + Math.random() * 6);
                    t.vx += (Math.random() - 0.5) * 8;
                }
                t.position.z = -wallDist;
            });

            if(isHolding) {
                raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                const intersects = raycaster.intersectObjects(targets);
                let hitObj = intersects.length > 0 ? intersects[0].object : null;
                if(hitObj && hitObj.type === 'LineSegments') hitObj = hitObj.parent;

                if(hitObj) {
                    score += Math.round(500 * dt); hits++;
                    hitObj.material = getTargetMaterial(window.SettingsManager.current.target, true);
                    if(gunGroup && Math.random() > 0.8) triggerRecoil();
                    anyHit = true;
                } else {
                    misses++;
                }
            }
            
            targets.forEach(t => {
                if(!isHolding || t.material.emissive.getHex() !== 0x444444) {
                    t.material = targetMaterial;
                }
            });

            updateStatsUI();
        }
    }

    if(gunGroup) {
        gunGroup.position.lerp(gunBasePos, 0.15);
        gunGroup.rotation.x += (0 - gunGroup.rotation.x) * 0.15;
    }

    renderer.render(scene, camera);
}

const gameController = new GameController(
    () => { startGame3D(); },
    () => { isPlaying = false; document.exitPointerLock(); document.body.style.cursor = 'default'; },
    () => { document.body.requestPointerLock(); if(timeLeft <= 0) startGame3D(); isPlaying = true; lastTime = performance.now(); }
);

init3D(); animate();
