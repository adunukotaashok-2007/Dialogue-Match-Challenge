export class MicrophoneManager {
  constructor() {
    this.stream = null;
    this.isRecording = false;
    this.audioContext = null;
    this.analyser = null;
    this.animId = null;
  }

  async requestAccess() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      return true;
    } catch (err) {
      console.error('Microphone access denied:', err);
      return false;
    }
  }

  startRecording(micIndicator) {
    if (!this.stream) return false;
    
    this.isRecording = true;
    
    // Set up audio analysis for visualization
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    
    if (micIndicator) {
      micIndicator.classList.add('recording');
      this.animateMicLevel(micIndicator);
    }
    
    return true;
  }

  animateMicLevel(micIndicator) {
    if (!this.analyser || !this.isRecording) return;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    const check = () => {
      if (!this.isRecording) return;
      
      this.analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const scale = 1 + (avg / 256) * 0.3;
      
      const icon = micIndicator.querySelector('.mic-icon');
      if (icon) {
        icon.style.transform = `scale(${scale})`;
      }
      
      this.animId = requestAnimationFrame(check);
    };
    
    check();
  }

  stopRecording(micIndicator) {
    this.isRecording = false;
    
    if (micIndicator) {
      micIndicator.classList.remove('recording');
      const icon = micIndicator.querySelector('.mic-icon');
      if (icon) icon.style.transform = 'scale(1)';
    }
    
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  release() {
    this.stopRecording();
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
  }
