
class SettingsManager {
    constructor() {
        this.defaultSettings = {
            sens: 1.0,
            fov: 90,
            xhair: {
                style: 'cross', // cross, dot, circle, crossdot
                color: '#00ffff',
                length: 10,
                thickness: 2,
                gap: 5
            },
            display: {
                showFps: true,
                showHitmarker: true
            },
            audio: {
                master: 50,
                hit: 80
            }
        };
        this.current = this.loadSettings();
        this.initDOM();
    }

    loadSettings() {
        const saved = localStorage.getItem('aimTrainerSettings');
        if (saved) {
            try { return { ...this.defaultSettings, ...JSON.parse(saved) }; }
            catch(e) { console.error("Error parsing settings", e); }
        }
        return { ...this.defaultSettings };
    }

    saveSettings() {
        localStorage.setItem('aimTrainerSettings', JSON.stringify(this.current));
        this.applySettingsToDOM();
        
        // Dispatch event for engines to update
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: this.current }));
    }

    initDOM() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active');
            });
        });

        // Sens
        const sSlider = document.getElementById('sens-slider');
        const sInput = document.getElementById('sens-input');
        if(sSlider && sInput) {
            sSlider.value = this.current.sens;
            sInput.value = this.current.sens;
            sSlider.addEventListener('input', e => { sInput.value = e.target.value; this.current.sens = parseFloat(e.target.value); this.updatePreview(); });
            sInput.addEventListener('change', e => { sSlider.value = e.target.value; this.current.sens = parseFloat(e.target.value); this.updatePreview(); });
        }

        // Crosshair
        ['style', 'color', 'length', 'thickness', 'gap'].forEach(key => {
            const el = document.getElementById(`xhair-${key}`);
            if(el) {
                el.value = this.current.xhair[key];
                el.addEventListener('input', e => {
                    this.current.xhair[key] = (key==='style'||key==='color') ? e.target.value : parseInt(e.target.value);
                    this.updatePreview();
                });
            }
        });

        // Display
        const fovSlider = document.getElementById('fov-slider');
        const fovDisplay = document.getElementById('fov-display');
        if(fovSlider && fovDisplay) {
            fovSlider.value = this.current.fov;
            fovDisplay.innerText = this.current.fov;
            fovSlider.addEventListener('input', e => {
                fovDisplay.innerText = e.target.value;
                this.current.fov = parseInt(e.target.value);
            });
        }
        
        ['show-fps', 'show-hitmarker'].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const key = id === 'show-fps' ? 'showFps' : 'showHitmarker';
                el.checked = this.current.display[key];
                el.addEventListener('change', e => { this.current.display[key] = e.target.checked; });
            }
        });

        // Audio
        ['master', 'hit'].forEach(key => {
            const el = document.getElementById(`vol-${key}`);
            if(el) {
                el.value = this.current.audio[key];
                el.addEventListener('input', e => { this.current.audio[key] = parseInt(e.target.value); });
            }
        });

        this.updatePreview();
        this.applySettingsToDOM();
    }

    updatePreview() {
        const preview = document.getElementById('crosshair-preview');
        const gameXhair = document.getElementById('game-crosshair');
        
        const styleCrosshair = (container) => {
            if(!container) return;
            container.innerHTML = '';
            const c = this.current.xhair;
            const size = (c.length * 2) + (c.gap * 2);
            container.style.width = `${size}px`;
            container.style.height = `${size}px`;
            container.style.position = 'relative';

            const createLine = (w, h, t, l) => {
                const d = document.createElement('div');
                d.style.position = 'absolute';
                d.style.background = c.color;
                d.style.width = `${w}px`; d.style.height = `${h}px`;
                d.style.top = t; d.style.left = l;
                return d;
            };

            const center = size / 2;
            const halfThick = c.thickness / 2;

            if (c.style === 'cross' || c.style === 'crossdot') {
                // Top
                container.appendChild(createLine(c.thickness, c.length, `${center - c.gap - c.length}px`, `${center - halfThick}px`));
                // Bottom
                container.appendChild(createLine(c.thickness, c.length, `${center + c.gap}px`, `${center - halfThick}px`));
                // Left
                container.appendChild(createLine(c.length, c.thickness, `${center - halfThick}px`, `${center - c.gap - c.length}px`));
                // Right
                container.appendChild(createLine(c.length, c.thickness, `${center - halfThick}px`, `${center + c.gap}px`));
            }

            if (c.style === 'dot' || c.style === 'crossdot') {
                const dotSize = Math.max(2, c.thickness);
                const dot = createLine(dotSize, dotSize, `${center - dotSize/2}px`, `${center - dotSize/2}px`);
                dot.style.borderRadius = '50%';
                container.appendChild(dot);
            }
            
            if (c.style === 'circle') {
                const radius = c.gap + c.length/2;
                const circ = document.createElement('div');
                circ.style.position = 'absolute';
                circ.style.border = `${c.thickness}px solid ${c.color}`;
                circ.style.borderRadius = '50%';
                circ.style.width = `${radius*2}px`;
                circ.style.height = `${radius*2}px`;
                circ.style.top = `${center - radius - c.thickness/2}px`;
                circ.style.left = `${center - radius - c.thickness/2}px`;
                container.appendChild(circ);
            }
        };

        styleCrosshair(preview);
        styleCrosshair(gameXhair);
    }
    
    applySettingsToDOM() {
        const fpsEl = document.getElementById('fps-display');
        if(fpsEl) fpsEl.style.display = this.current.display.showFps ? 'block' : 'none';
        this.updatePreview();
    }
}

// Global instance
window.SettingsManager = new SettingsManager();
