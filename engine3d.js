
let scene, camera, renderer, raycaster;
let targets = [];
const TARGET_RADIUS = 2;
const MAX_TARGETS = 3;

let score = 0, hits = 0, misses = 0;
let timeLeft = 60.0;
let lastTime = performance.now();
let isPlaying = false;

const uiScore = document.getElementById('score-display');
const uiTime = document.getElementById('time-display');
const uiAcc = document.getElementById('acc-display');
const hitmarker = document.getElementById('hitmarker');

let isLocked = false;
document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === document.body;
    if (!isLocked && isPlaying) gameController.pause();
});

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

    scene.add(new THREE.GridHelper(100, 50, 0x00f0ff, 0x222222));
    raycaster = new THREE.Raycaster();

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
            // Because hitbox edges might be children, we need to trace back to parent mesh
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
        
        // Re-render targets instantly to apply shape changes
        if (isPlaying || timeLeft > 0) {
            targets.forEach(t => scene.remove(t));
            targets = [];
            for(let i=0; i<MAX_TARGETS; i++) spawnTarget3D();
        }
    });
}

function spawnTarget3D() {
    const shape = window.SettingsManager.current.display.targetShape;
    const showHitboxes = window.SettingsManager.current.display.showHitboxes;

    let geometry;
    if (shape === 'square') {
        geometry = new THREE.BoxGeometry(TARGET_RADIUS*2, TARGET_RADIUS*2, TARGET_RADIUS*2);
    } else {
        geometry = new THREE.SphereGeometry(TARGET_RADIUS, 32, 32);
    }

    const material = new THREE.MeshPhongMaterial({ color: 0x00f0ff, emissive: 0x004455, shininess: 100 });
    const mesh = new THREE.Mesh(geometry, material);
    
    if (showHitboxes) {
        // Create an outer red bounding box skeleton to show hitbox
        const hbGeo = new THREE.BoxGeometry(TARGET_RADIUS*2.1, TARGET_RADIUS*2.1, TARGET_RADIUS*2.1);
        const edges = new THREE.EdgesGeometry(hbGeo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff0000 }));
        mesh.add(line);
    }
    
    const dist = 15 + Math.random() * 20;
    const angleX = (Math.random() - 0.5) * Math.PI * 0.6;
    const angleY = (Math.random() - 0.2) * Math.PI * 0.3;
    
    mesh.position.x = Math.sin(angleX) * dist;
    mesh.position.y = 5 + Math.sin(angleY) * dist;
    mesh.position.z = -Math.cos(angleX) * dist;

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
