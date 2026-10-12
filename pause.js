
class GameController {
    constructor(startCallback, pauseCallback, resumeCallback) {
        this.state = 'MENU'; // MENU, PLAYING, PAUSED, RESULTS
        this.startCb = startCallback;
        this.pauseCb = pauseCallback;
        this.resumeCb = resumeCallback;
        
        this.pauseMenu = document.getElementById('pause-menu');
        this.resultsMenu = document.getElementById('results-menu');
        this.settingsMenu = document.getElementById('settings-overlay');
        
        this.bindEvents();
    }

    bindEvents() {
        // Start / Resume button
        const resBtn = document.getElementById('resume-btn');
        if(resBtn) {
            resBtn.addEventListener('click', () => {
                if(window.SoundEngine.ctx.state === 'suspended') window.SoundEngine.ctx.resume();
                this.resume();
            });
        }
        
        // Settings open/close
        const setBtn = document.getElementById('open-settings-game');
        const closeSetBtn = document.getElementById('close-settings');
        if(setBtn) setBtn.addEventListener('click', () => this.settingsMenu.classList.remove('hidden'));
        if(closeSetBtn) closeSetBtn.addEventListener('click', () => {
            this.settingsMenu.classList.add('hidden');
            window.SettingsManager.saveSettings();
        });

        // Keyboard Pause
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || (e.key === 'p' && e.ctrlKey === false)) {
                // If settings are open, close them first
                if (!this.settingsMenu.classList.contains('hidden')) {
                    this.settingsMenu.classList.add('hidden');
                    window.SettingsManager.saveSettings();
                    return;
                }
                
                if (this.state === 'PLAYING') {
                    this.pause();
                } else if (this.state === 'PAUSED') {
                    this.resume();
                }
            }
        });
    }

    resume() {
        if(this.state === 'RESULTS') return;
        this.state = 'PLAYING';
        this.pauseMenu.classList.add('hidden');
        if(this.resumeCb) this.resumeCb();
    }

    pause() {
        if(this.state !== 'PLAYING') return;
        this.state = 'PAUSED';
        this.pauseMenu.classList.remove('hidden');
        document.getElementById('pause-title').innerText = "PAUSED";
        document.getElementById('resume-btn').innerText = "Resume";
        if(this.pauseCb) this.pauseCb();
    }

    showResults(stats) {
        this.state = 'RESULTS';
        if(this.pauseCb) this.pauseCb(); // stop engines
        
        document.getElementById('res-score').innerText = stats.score;
        document.getElementById('res-acc').innerText = `${stats.acc}%`;
        document.getElementById('res-hits').innerText = stats.hits;
        document.getElementById('res-miss').innerText = stats.misses;
        if(document.getElementById('res-combo')) document.getElementById('res-combo').innerText = stats.maxCombo;
        
        this.resultsMenu.classList.remove('hidden');
        
        document.getElementById('restart-btn').onclick = () => {
            this.resultsMenu.classList.add('hidden');
            if(this.startCb) this.startCb();
            this.resume();
        };
    }
}
