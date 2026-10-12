
class SoundEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    playTone(freq, type, duration, vol) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        const masterVol = window.SettingsManager.current.audio.master / 100;
        const sfxVol = (vol / 100) * masterVol;
        
        gain.gain.setValueAtTime(sfxVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playHit() {
        const vol = window.SettingsManager.current.audio.hit;
        if(vol === 0) return;
        // Satisfying bell ping
        this.playTone(880, 'sine', 0.1, vol);
        setTimeout(() => this.playTone(1760, 'sine', 0.2, vol*0.5), 20);
    }

    playMiss() {
        const vol = window.SettingsManager.current.audio.hit * 0.5; // lower volume for miss
        if(vol === 0) return;
        // Dull thud
        this.playTone(150, 'square', 0.1, vol);
    }
}

window.SoundEngine = new SoundEngine();

// Hook up test button
const testBtn = document.getElementById('test-hit-sound');
if(testBtn) {
    testBtn.addEventListener('click', () => {
        if(window.SoundEngine.ctx.state === 'suspended') window.SoundEngine.ctx.resume();
        window.SoundEngine.playHit();
    });
}
