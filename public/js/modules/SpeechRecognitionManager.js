export class SpeechRecognitionManager {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.supported = false;
      console.warn('Speech Recognition not supported in this browser');
      return;
    }
    
    this.supported = true;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.onResult = null;
    this.onEnd = null;
    this.isListening = false;
  }

  setLanguage(lang) {
    if (!this.supported) return;
    this.recognition.lang = lang === 'te' ? 'te-IN' : 'en-US';
  }

  start(onInterim, onFinal) {
    if (!this.supported) {
      // Fallback: prompt for text input
      const text = prompt('Speech recognition not supported. Type the dialogue:');
      if (onFinal) onFinal(text || '');
      return;
    }

    this.finalTranscript = '';
    this.interimTranscript = '';
    this.isListening = true;

    this.recognition.onresult = (event) => {
      this.interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          this.finalTranscript += event.results[i][0].transcript;
        } else {
          this.interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const currentText = this.finalTranscript + this.interimTranscript;
      if (onInterim) onInterim(currentText);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      const finalText = this.finalTranscript || this.interimTranscript;
      if (onFinal) onFinal(finalText.trim());
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access is required for speech recognition.');
      }
      this.isListening = false;
      // Still return what we have
      const finalText = this.finalTranscript || this.interimTranscript;
      if (onFinal) onFinal(finalText.trim());
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error('Recognition start error:', e);
    }
  }

  stop() {
    if (!this.supported || !this.isListening) return;
    try {
      this.recognition.stop();
    } catch (e) {
      console.error('Recognition stop error:', e);
    }
  }

  getTranscript() {
    return (this.finalTranscript + this.interimTranscript).trim();
  }
}
