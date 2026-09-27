export class AudioManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.currentUtterance = null;
    this.isPlaying = false;
    this.waveformCtx = null;
    this.waveformCanvas = null;
    this.waveformAnimId = null;
    this.audioContext = null;
    this.analyser = null;
  }

  init(waveformCanvas) {
    this.waveformCanvas = waveformCanvas;
    if (waveformCanvas) {
      this.waveformCtx = waveformCanvas.getContext('2d');
    }
  }

  speak(text, lang = 'en-US') {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      this.synth.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'te' ? 'te-IN' : 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Try to find a good voice
      const voices = this.synth.getVoices();
      const langCode = lang === 'te' ? 'te' : 'en';
      const preferredVoice = voices.find(v => v.lang.startsWith(langCode) && v.localService === false) 
                          || voices.find(v => v.lang.startsWith(langCode));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      this.currentUtterance = utterance;
      this.isPlaying = true;

      utterance.onstart = () => {
        this.startWaveformAnimation();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.stopWaveformAnimation();
        resolve();
      };

      utterance.onerror = (e) => {
        this.isPlaying = false;
        this.stopWaveformAnimation();
        // Don't reject on 'interrupted' - that's expected when replaying
        if (e.error === 'interrupted' || e.error === 'canceled') {
          resolve();
        } else {
          reject(e);
        }
      };

      // Voices may load async
      if (voices.length === 0) {
        this.synth.addEventListener('voiceschanged', () => {
          const v = this.synth.getVoices();
          const pref = v.find(v2 => v2.lang.startsWith(langCode));
          if (pref) utterance.voice = pref;
          this.synth.speak(utterance);
        }, { once: true });
      } else {
        this.synth.speak(utterance);
      }
    });
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    this.stopWaveformAnimation();
  }

  startWaveformAnimation() {
    if (!this.waveformCtx || !this.waveformCanvas) return;
    
    const canvas = this.waveformCanvas;
    const ctx = this.waveformCtx;
    const width = canvas.width;
    const height = canvas.height;
    
    let phase = 0;
    
    const draw = () => {
      if (!this.isPlaying) {
        this.clearWaveform();
        return;
      }
      
      ctx.clearRect(0, 0, width, height);
      
      // Draw multiple waves
      const waves = [
        { amplitude: 25, frequency: 0.02, speed: 0.05, color: 'rgba(108,92,231,0.6)' },
        { amplitude: 18, frequency: 0.03, speed: 0.07, color: 'rgba(253,121,168,0.4)' },
        { amplitude: 12, frequency: 0.04, speed: 0.03, color: 'rgba(0,206,201,0.3)' }
      ];
      
      waves.forEach(wave => {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 2;
        
        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * wave.frequency + phase * wave.speed) * wave.amplitude * (0.5 + 0.5 * Math.sin(phase * 0.02));
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        
        ctx.stroke();
      });
      
      phase++;
      this.waveformAnimId = requestAnimationFrame(draw);
    };
    
    draw();
  }

  stopWaveformAnimation() {
    if (this.waveformAnimId) {
      cancelAnimationFrame(this.waveformAnimId);
      this.waveformAnimId = null;
    }
    this.clearWaveform();
  }

  clearWaveform() {
    if (this.waveformCtx && this.waveformCanvas) {
      this.waveformCtx.clearRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height);
    }
  }
}
