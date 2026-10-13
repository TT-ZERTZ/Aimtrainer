class SettingsManager {
    constructor() {
        this.defaultSettings = {
            sens: 1.0, fov: 90,
            xhair: { style: 'cross', color: '#00ffff', length: 10, thickness: 2, gap: 5 },
            target: { shape: 'square', color: '#00f0ff', pattern: 'grid', size: 100, showHitboxes: false },
            arena: { scale: 100, distance: 20, gravity: 1200, showGun: true },
            display: { showFps: true, showHitmarker: true },
            audio: { master: 50, hit: 80 }
        };
        this.current = this.loadSettings();
        this.initDOM();
    }

    loadSettings() {
        const saved = localStorage.getItem('aimTrainerSettings');
        if (saved) {
            try { 
                let parsed = JSON.parse(saved);
                if(!parsed.target) parsed.target = { ...this.defaultSettings.target };
                if(!parsed.arena) parsed.arena = { ...this.defaultSettings.arena };
                if(parsed.arena.gravity === undefined) parsed.arena.gravity = 1200;
                if(parsed.arena.showGun === undefined) parsed.arena.showGun = true;
                return { ...this.defaultSettings, ...parsed }; 
            } catch(e) { console.error(e); }
        }
        return { ...this.defaultSettings };
    }

    saveSettings() {
        localStorage.setItem('aimTrainerSettings', JSON.stringify(this.current));
        this.applySettingsToDOM();
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: this.current }));
    }

    updateExportCode() {
        const codeInput = document.getElementById('export-code-input');
        if(codeInput) {
            try {
                const jsonStr = JSON.stringify(this.current);
                codeInput.value = btoa(jsonStr);
            } catch(e) { console.error(e); }
        }
    }

    importLevelCode(code) {
        try {
            const jsonStr = atob(code.trim());
            const parsed = JSON.parse(jsonStr);
            if(parsed && parsed.target && parsed.arena) {
                this.current = { ...this.defaultSettings, ...parsed };
                this.saveSettings();
                return true;
            }
        } catch(e) { console.error(e); }
        return false;
    }

    initDOM() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active');
                if(e.target.dataset.tab === 'designer') {
                    this.updateExportCode();
                }
            });
        });

        // Arena & Physics binds
        const aScale = document.getElementById('arena-scale'); const aScaleD = document.getElementById('arena-scale-display');
        if(aScale) { aScale.value = this.current.arena.scale; aScaleD.innerText = this.current.arena.scale + '%'; aScale.addEventListener('input', e => { aScaleD.innerText = e.target.value + '%'; this.current.arena.scale = parseInt(e.target.value); }); }
        
        const aDist = document.getElementById('arena-dist'); const aDistD = document.getElementById('arena-dist-display');
        if(aDist) { aDist.value = this.current.arena.distance; aDistD.innerText = this.current.arena.distance + 'm'; aDist.addEventListener('input', e => { aDistD.innerText = e.target.value + 'm'; this.current.arena.distance = parseInt(e.target.value); }); }
        
        const aGrav = document.getElementById('arena-gravity'); const aGravD = document.getElementById('arena-gravity-display');
        if(aGrav) { aGrav.value = this.current.arena.gravity; aGravD.innerText = this.current.arena.gravity; aGrav.addEventListener('input', e => { aGravD.innerText = e.target.value; this.current.arena.gravity = parseInt(e.target.value); }); }

        const aGun = document.getElementById('show-gun');
        if(aGun) { aGun.checked = this.current.arena.showGun; aGun.addEventListener('change', e => this.current.arena.showGun = e.target.checked); }

        // Level Coder Copy / Load binds
        const copyBtn = document.getElementById('copy-code-btn');
        if(copyBtn) {
            copyBtn.addEventListener('click', () => {
                const codeInput = document.getElementById('export-code-input');
                codeInput.select();
                navigator.clipboard.writeText(codeInput.value);
                copyBtn.innerText = 'Copied!';
                setTimeout(() => copyBtn.innerText = 'Copy', 1500);
            });
        }

        const loadBtn = document.getElementById('load-code-btn');
        if(loadBtn) {
            loadBtn.addEventListener('click', () => {
                const val = document.getElementById('import-code-input').value;
                if(this.importLevelCode(val)) {
                    alert('Level code successfully loaded and applied!');
                    document.getElementById('settings-overlay').classList.add('hidden');
                } else {
                    alert('Invalid level code format.');
                }
            });
        }

        // Target Design binds
        const tShape = document.getElementById('target-shape'); if(tShape) { tShape.value = this.current.target.shape; tShape.addEventListener('change', e => this.current.target.shape = e.target.value); }
        const tPattern = document.getElementById('target-pattern'); if(tPattern) { tPattern.value = this.current.target.pattern; tPattern.addEventListener('change', e => this.current.target.pattern = e.target.value); }
        const tColor = document.getElementById('target-color'); if(tColor) { tColor.value = this.current.target.color; tColor.addEventListener('input', e => this.current.target.color = e.target.value); }
        const tSize = document.getElementById('target-size'); const tSizeDisp = document.getElementById('target-size-display');
        if(tSize && tSizeDisp) { tSize.value = this.current.target.size; tSizeDisp.innerText = this.current.target.size + '%'; tSize.addEventListener('input', e => { tSizeDisp.innerText = e.target.value + '%'; this.current.target.size = parseInt(e.target.value); }); }
        const tHitboxes = document.getElementById('show-target-hitboxes'); if(tHitboxes) { tHitboxes.checked = this.current.target.showHitboxes; tHitboxes.addEventListener('change', e => this.current.target.showHitboxes = e.target.checked); }

        // Standard binds
        ['show-fps', 'show-hitmarker'].forEach(id => { const el = document.getElementById(id); if(el) { const key = id === 'show-fps' ? 'showFps' : 'showHitmarker'; el.checked = this.current.display[key]; el.addEventListener('change', e => { this.current.display[key] = e.target.checked; }); } });
        const sSlider = document.getElementById('sens-slider'); const sInput = document.getElementById('sens-input');
        if(sSlider && sInput) { sSlider.value = this.current.sens; sInput.value = this.current.sens; sSlider.addEventListener('input', e => { sInput.value = e.target.value; this.current.sens = parseFloat(e.target.value); }); sInput.addEventListener('change', e => { sSlider.value = e.target.value; this.current.sens = parseFloat(e.target.value); }); }
        ['style', 'color', 'length', 'thickness', 'gap'].forEach(key => { const el = document.getElementById(`xhair-${key}`); if(el) { el.value = this.current.xhair[key]; el.addEventListener('input', e => { this.current.xhair[key] = (key==='style'||key==='color') ? e.target.value : parseInt(e.target.value); this.updatePreview(); }); } });
        const fovSlider = document.getElementById('fov-slider'); const fovDisplay = document.getElementById('fov-display');
        if(fovSlider && fovDisplay) { fovSlider.value = this.current.fov; fovDisplay.innerText = this.current.fov; fovSlider.addEventListener('input', e => { fovDisplay.innerText = e.target.value; this.current.fov = parseInt(e.target.value); }); }
        ['master', 'hit'].forEach(key => { const el = document.getElementById(`vol-${key}`); if(el) { el.value = this.current.audio[key]; el.addEventListener('input', e => { this.current.audio[key] = parseInt(e.target.value); }); } });

        this.updatePreview(); this.applySettingsToDOM();
    }

    updatePreview() {
        const styleCrosshair = (container) => {
            if(!container) return; container.innerHTML = '';
            const c = this.current.xhair; const size = (c.length * 2) + (c.gap * 2);
            container.style.width = `${size}px`; container.style.height = `${size}px`; container.style.position = 'relative';
            const createLine = (w, h, t, l) => { const d = document.createElement('div'); d.style.position = 'absolute'; d.style.background = c.color; d.style.width = `${w}px`; d.style.height = `${h}px`; d.style.top = t; d.style.left = l; return d; };
            const center = size / 2; const halfThick = c.thickness / 2;
            if (c.style === 'cross' || c.style === 'crossdot') {
                container.appendChild(createLine(c.thickness, c.length, `${center - c.gap - c.length}px`, `${center - halfThick}px`)); container.appendChild(createLine(c.thickness, c.length, `${center + c.gap}px`, `${center - halfThick}px`)); container.appendChild(createLine(c.length, c.thickness, `${center - halfThick}px`, `${center - c.gap - c.length}px`)); container.appendChild(createLine(c.length, c.thickness, `${center - halfThick}px`, `${center + c.gap}px`));
            }
            if (c.style === 'dot' || c.style === 'crossdot') { const dotSize = Math.max(2, c.thickness); const dot = createLine(dotSize, dotSize, `${center - dotSize/2}px`, `${center - dotSize/2}px`); dot.style.borderRadius = '50%'; container.appendChild(dot); }
            if (c.style === 'circle') { const radius = c.gap + c.length/2; const circ = document.createElement('div'); circ.style.position = 'absolute'; circ.style.border = `${c.thickness}px solid ${c.color}`; circ.style.borderRadius = '50%'; circ.style.width = `${radius*2}px`; circ.style.height = `${radius*2}px`; circ.style.top = `${center - radius - c.thickness/2}px`; circ.style.left = `${center - radius - c.thickness/2}px`; container.appendChild(circ); }
        };
        styleCrosshair(document.getElementById('crosshair-preview')); styleCrosshair(document.getElementById('game-crosshair'));
    }
    
    applySettingsToDOM() {
        const fpsEl = document.getElementById('fps-display'); if(fpsEl) fpsEl.style.display = this.current.display.showFps ? 'block' : 'none';
        this.updatePreview();
    }
}
window.SettingsManager = new SettingsManager();
