
let scene, camera, renderer, raycaster;
let targets = [];
const TARGET_RADIUS = 2;
const MAX_TARGETS = 3;
const BOUNDARY = 20;

let score = 0, hits = 0, misses = 0;
let timeLeft = 60.0;
let lastTime = performance.now();
let isPlaying = false;

// UI
const uiScore = document.getElementById('score-display');
const uiTime = document.getElementById('time-display');
const uiAcc = document.getElementById('acc-display');
const hitmarker = document.getElementById('hitmarker');

// Pointer Lock setup
let isLocked = false;
document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === document.body;
    if (!isLocked && isPlaying) {
        // User pressed ESC natively
        gameController.pause();
    }
});

function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c0d14');
    scene.fog = new THREE.Fog('#0c0d14', 10, 100);

    camera = new THREE.PerspectiveCamera(window.SettingsManager.current.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 5; // Eye height

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas-3d'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Environment (Grid Room)
    const gridHelper = new THREE.GridHelper(100, 50, 0x00f0ff, 0x222222);
    scene.add(gridHelper);

    // Raycaster (always pointing center)
    raycaster = new THREE.Raycaster();

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Mouse Look (Custom simple implementation)
    let euler = new THREE.Euler(0, 0, 0, 'YXZ');
    document.addEventListener('mousemove', (e) => {
        if (!isLocked || !isPlaying) return;
        
        // Base sensitivity scaled by setting
        const sens = 0.002 * window.SettingsManager.current.sens;
        
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= e.movementX * sens;
        euler.x -= e.movementY * sens;
        
        // Clamp pitch
        euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, euler.x));
        
        camera.quaternion.setFromEuler(euler);
    });

    // Shooting
    document.addEventListener('mousedown', (e) => {
        if (!isLocked || !isPlaying || e.button !== 0) return;
        
        // Raycast from center screen
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        
        const intersects = raycaster.intersectObjects(targets);
        if (intersects.length > 0) {
            // Hit
            const hitObj = intersects[0].object;
            scene.remove(hitObj);
            targets = targets.filter(t => t !== hitObj);
            
            hits++;
            score += 100;
            window.SoundEngine.playHit();
            
            if(window.SettingsManager.current.display.showHitmarker) {
                hitmarker.classList.add('active');
                setTimeout(() => hitmarker.classList.remove('active'), 100);
            }
            
            spawnTarget3D();
        } else {
            // Miss
            misses++;
            window.SoundEngine.playMiss();
        }
        updateStatsUI();
    });

    // Settings update listener (FOV changes)
    window.addEventListener('settingsUpdated', (e) => {
        camera.fov = e.detail.fov;
        camera.updateProjectionMatrix();
    });
}

function spawnTarget3D() {
    const geometry = new THREE.SphereGeometry(TARGET_RADIUS, 32, 32);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0x00f0ff,
        emissive: 0x004455,
        shininess: 100
    });
    const sphere = new THREE.Mesh(geometry, material);
    
    // Spawn in a cone in front of player
    const dist = 15 + Math.random() * 20; // 15 to 35 units away
    const angleX = (Math.random() - 0.5) * Math.PI * 0.6; // horizontal spread
    const angleY = (Math.random() - 0.2) * Math.PI * 0.3; // vertical spread
    
    sphere.position.x = Math.sin(angleX) * dist;
    sphere.position.y = 5 + Math.sin(angleY) * dist;
    sphere.position.z = -Math.cos(angleX) * dist;

    scene.add(sphere);
    targets.push(sphere);
}

function updateStatsUI() {
    uiScore.innerText = score;
    const acc = (hits + misses === 0) ? 100 : Math.round((hits / (hits + misses)) * 100);
    uiAcc.innerText = acc;
}

function startGame3D() {
    score = 0; hits = 0; misses = 0;
    timeLeft = 60.0;
    
    // Clear old
    targets.forEach(t => scene.remove(t));
    targets = [];
    
    for(let i=0; i<MAX_TARGETS; i++) spawnTarget3D();
    updateStatsUI();
}

function endGame3D() {
    isPlaying = false;
    document.exitPointerLock();
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
        if (timeLeft <= 0) {
            timeLeft = 0;
            endGame3D();
        }
        uiTime.innerText = timeLeft.toFixed(1);
    }

    renderer.render(scene, camera);
}


// Init Controller
const gameController = new GameController(
    () => { startGame3D(); },
    () => { isPlaying = false; document.exitPointerLock(); }, // pause
    () => { 
        document.body.requestPointerLock();
        if(timeLeft <= 0) startGame3D();
        isPlaying = true; 
        lastTime = performance.now();
    } // resume
);

init3D();
animate();
