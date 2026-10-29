/**
 * Galileo Nut Drop Experiment - Audio Synthesizer (Web Audio API)
 * Tạo âm thanh va chạm kim loại đai ốc chân thực và các âm thanh hỗ trợ học tập
 * Hoạt động 100% offline, an toàn và tự bọc try/catch chống lỗi trình duyệt chặn autoplay.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.soundType = 'metal'; // 'metal', 'bell', 'metronome', 'wood'
        this.volume = 0.8;
        this.muted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime || 0);
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API không khả dụng hoặc bị chặn:', e);
        }
    }

    resume() {
        try {
            if (!this.initialized) {
                this.init();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        } catch (e) {
            console.warn('Lỗi resume AudioContext:', e);
        }
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        if (this.masterGain && this.ctx) {
            try {
                this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
            } catch (e) {}
        }
    }

    setMuted(isMuted) {
        this.muted = isMuted;
        if (this.masterGain && this.ctx) {
            try {
                this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
            } catch (e) {}
        }
    }

    setSoundType(type) {
        this.soundType = type;
    }

    /**
     * Phát tiếng "cạch" kim loại khi đai ốc chạm mâm kim loại
     */
    playNutImpact(velocity = 3, pitchMod = 1.0) {
        try {
            this.resume();
            if (!this.ctx || this.muted) return;

            const now = this.ctx.currentTime;
            const velFactor = Math.min(1.5, Math.max(0.6, velocity / 3.0));

            switch (this.soundType) {
                case 'metal':
                    this._playMetallicClack(now, velFactor, pitchMod);
                    break;
                case 'bell':
                    this._playGalileoBell(now, velFactor, pitchMod);
                    break;
                case 'metronome':
                    this._playMetronomeTick(now, velFactor, pitchMod);
                    break;
                case 'wood':
                    this._playWoodClack(now, velFactor, pitchMod);
                    break;
                default:
                    this._playMetallicClack(now, velFactor, pitchMod);
            }
        } catch (err) {
            console.warn('Lỗi phát âm thanh va chạm:', err);
        }
    }

    _playMetallicClack(now, velFactor, pitchMod) {
        const ctx = this.ctx;
        try {
            // A. Noise burst
            const bufferSize = Math.floor(ctx.sampleRate * 0.025);
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const whiteNoise = ctx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;

            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(3200 * pitchMod, now);
            noiseFilter.Q.setValueAtTime(2.5, now);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.7 * velFactor, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

            whiteNoise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.masterGain);

            whiteNoise.start(now);
            whiteNoise.stop(now + 0.03);

            // B. Metallic resonances
            const freqs = [1280 * pitchMod, 2450 * pitchMod, 4120 * pitchMod];
            const decays = [0.08, 0.05, 0.03];
            const gains = [0.5, 0.35, 0.2];

            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();

                osc.type = idx === 0 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.92, now + decays[idx]);

                gainNode.gain.setValueAtTime(gains[idx] * velFactor, now);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decays[idx]);

                osc.connect(gainNode);
                gainNode.connect(this.masterGain);

                osc.start(now);
                osc.stop(now + decays[idx] + 0.01);
            });

            // C. Thump
            const thump = ctx.createOscillator();
            const thumpGain = ctx.createGain();
            thump.type = 'sine';
            thump.frequency.setValueAtTime(260 * pitchMod, now);
            thump.frequency.exponentialRampToValueAtTime(70, now + 0.04);

            thumpGain.gain.setValueAtTime(0.4 * velFactor, now);
            thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            thump.connect(thumpGain);
            thumpGain.connect(this.masterGain);

            thump.start(now);
            thump.stop(now + 0.045);
        } catch (e) {}
    }

    _playGalileoBell(now, velFactor, pitchMod) {
        const ctx = this.ctx;
        try {
            const freqs = [1760 * pitchMod, 3520 * pitchMod, 5280 * pitchMod];
            const gains = [0.6, 0.25, 0.1];

            freqs.forEach((f, i) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now);

                const duration = 0.22 / (i + 1);
                g.gain.setValueAtTime(gains[i] * velFactor, now);
                g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

                osc.connect(g);
                g.connect(this.masterGain);

                osc.start(now);
                osc.stop(now + duration);
            });
        } catch (e) {}
    }

    _playMetronomeTick(now, velFactor, pitchMod) {
        const ctx = this.ctx;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(2400 * pitchMod, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.015);

            gain.gain.setValueAtTime(0.9 * velFactor, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.02);
        } catch (e) {}
    }

    _playWoodClack(now, velFactor, pitchMod) {
        const ctx = this.ctx;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(850 * pitchMod, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

            gain.gain.setValueAtTime(0.8 * velFactor, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.04);
        } catch (e) {}
    }

    playReleaseSound() {
        try {
            this.resume();
            if (!this.ctx || this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(480, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

            gain.gain.setValueAtTime(0.25 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.masterGain || this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {}
    }
}

// Khởi tạo một singleton dùng chung
window.soundEngine = new SoundEngine();
