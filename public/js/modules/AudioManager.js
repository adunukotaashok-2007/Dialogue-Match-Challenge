/**
 * AudioManager.js
 * ============================================================
 * Handles:
 *  - English / Telugu Text-to-Speech
 *  - Async browser voice loading
 *  - Speech playback state
 *  - Animated waveform
 *  - Stop / cancel speech
 *  - Game sound effects using Web Audio API
 *
 * No external audio files are required.
 */

export class AudioManager {
  constructor() {
    // ==========================================================
    // TEXT TO SPEECH
    // ==========================================================

    this.synth =
      typeof window !== "undefined" && "speechSynthesis" in window
        ? window.speechSynthesis
        : null;

    this.voices = [];
    this.currentUtterance = null;
    this.isPlaying = false;
    this.voicesLoaded = false;

    // ==========================================================
    // WAVEFORM
    // ==========================================================

    this.waveformCtx = null;
    this.waveformCanvas = null;
    this.waveformAnimId = null;

    // ==========================================================
    // WEB AUDIO
    // ==========================================================

    this.audioContext = null;
    this.masterGain = null;

    // Whether sound effects are enabled
    this.soundEnabled = true;

    // Master volume
    this.masterVolume = 0.5;

    // Load available voices
    this.loadVoices();

    if (this.synth) {
      this.synth.addEventListener("voiceschanged", () => {
        this.loadVoices();
      });
    }
  }

  // ==========================================================
  // VOICE MANAGEMENT
  // ==========================================================

  loadVoices() {
    if (!this.synth) {
      this.voices = [];
      this.voicesLoaded = false;
      return;
    }

    this.voices = this.synth.getVoices() || [];
    this.voicesLoaded = this.voices.length > 0;
  }

  /**
   * Initialize waveform canvas.
   *
   * @param {HTMLCanvasElement|null} waveformCanvas
   */
  init(waveformCanvas) {
    this.waveformCanvas = waveformCanvas || null;

    if (this.waveformCanvas) {
      this.waveformCtx = this.waveformCanvas.getContext("2d");
      this.clearWaveform();
    } else {
      this.waveformCtx = null;
    }
  }

  // ==========================================================
  // TEXT TO SPEECH
  // ==========================================================

  /**
   * Speak text.
   *
   * @param {string} text
   * @param {"en"|"te"|"en-US"|"te-IN"} lang
   * @returns {Promise<void>}
   */
  speak(text, lang = "en") {
    return new Promise((resolve, reject) => {
      if (!text || typeof text !== "string") {
        resolve();
        return;
      }

      if (!this.synth) {
        reject(new Error("Speech synthesis is not supported by this browser."));
        return;
      }

      // Stop previous speech
      this.stop();

      // Make sure voices are refreshed
      this.loadVoices();

      const language = this.normalizeLanguage(lang);

      const utterance = new SpeechSynthesisUtterance(text);

      utterance.lang = language;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Find a suitable voice
      const voice = this.findVoice(language);

      if (voice) {
        utterance.voice = voice;
      }

      this.currentUtterance = utterance;
      this.isPlaying = true;

      // ========================================================
      // SPEECH EVENTS
      // ========================================================

      utterance.onstart = () => {
        this.isPlaying = true;
        this.startWaveformAnimation();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        this.stopWaveformAnimation();

        resolve();
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        this.currentUtterance = null;
        this.stopWaveformAnimation();

        // These normally happen when speech is intentionally stopped.
        if (
          event.error === "interrupted" ||
          event.error === "canceled"
        ) {
          resolve();
          return;
        }

        reject(event);
      };

      // ========================================================
      // VOICES CAN LOAD AFTER PAGE LOAD
      // ========================================================

      if (this.voices.length === 0) {
        let spoken = false;

        const speakWhenReady = () => {
          if (spoken) return;

          const voices = this.synth.getVoices() || [];

          if (voices.length > 0) {
            spoken = true;

            const selectedVoice = this.findVoice(language, voices);

            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }

            this.synth.speak(utterance);
          }
        };

        this.synth.addEventListener(
          "voiceschanged",
          speakWhenReady,
          { once: true }
        );

        // Some browsers don't fire voiceschanged reliably.
        setTimeout(() => {
          if (!spoken) {
            spoken = true;

            this.loadVoices();

            const selectedVoice = this.findVoice(
              language,
              this.voices
            );

            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }

            this.synth.speak(utterance);
          }
        }, 300);
      } else {
        this.synth.speak(utterance);
      }
    });
  }

  // ==========================================================
  // LANGUAGE
  // ==========================================================

  normalizeLanguage(lang) {
    if (!lang) return "en-US";

    const value = String(lang).toLowerCase();

    if (
      value === "te" ||
      value === "te-in" ||
      value.startsWith("te")
    ) {
      return "te-IN";
    }

    return "en-US";
  }

  // ==========================================================
  // VOICE SELECTION
  // ==========================================================

  findVoice(language, voices = this.voices) {
    if (!voices || voices.length === 0) {
      return null;
    }

    const langPrefix = language
      .split("-")[0]
      .toLowerCase();

    // Prefer exact language
    let voice = voices.find(
      (v) => v.lang && v.lang.toLowerCase() === language.toLowerCase()
    );

    if (voice) return voice;

    // Then language family
    voice = voices.find(
      (v) =>
        v.lang &&
        v.lang.toLowerCase().startsWith(langPrefix)
    );

    if (voice) return voice;

    return null;
  }

  // ==========================================================
  // STOP SPEECH
  // ==========================================================

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }

    this.isPlaying = false;
    this.currentUtterance = null;

    this.stopWaveformAnimation();
  }

  // ==========================================================
  // PAUSE SPEECH
  // ==========================================================

  pause() {
    if (!this.synth) return;

    if (this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
    }
  }

  // ==========================================================
  // RESUME SPEECH
  // ==========================================================

  resume() {
    if (!this.synth) return;

    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  // ==========================================================
  // CHECK SPEECH STATUS
  // ==========================================================

  isSpeaking() {
    return !!(
      this.synth &&
      this.synth.speaking
    );
  }

  // ==========================================================
  // WAVEFORM ANIMATION
  // ==========================================================

  startWaveformAnimation() {
    if (!this.waveformCtx || !this.waveformCanvas) {
      return;
    }

    // Prevent duplicate animations
    this.stopWaveformAnimation();

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

      ctx.clearRect(
        0,
        0,
        width,
        height
      );

      const centerY = height / 2;

      // ========================================================
      // WAVE 1
      // ========================================================

      this.drawWave(
        ctx,
        width,
        centerY,
        phase,
        {
          amplitude: Math.max(10, height * 0.28),
          frequency: 0.025,
          speed: 0.06,
          lineWidth: 2,
          color: "rgba(108, 92, 231, 0.65)"
        }
      );

      // ========================================================
      // WAVE 2
      // ========================================================

      this.drawWave(
        ctx,
        width,
        centerY,
        phase,
        {
          amplitude: Math.max(8, height * 0.20),
          frequency: 0.035,
          speed: 0.08,
          lineWidth: 2,
          color: "rgba(253, 121, 168, 0.45)"
        }
      );

      // ========================================================
      // WAVE 3
      // ========================================================

      this.drawWave(
        ctx,
        width,
        centerY,
        phase,
        {
          amplitude: Math.max(6, height * 0.14),
          frequency: 0.045,
          speed: 0.04,
          lineWidth: 2,
          color: "rgba(0, 206, 201, 0.35)"
        }
      );

      phase++;

      this.waveformAnimId =
        requestAnimationFrame(draw);
    };

    draw();
  }

  // ==========================================================
  // DRAW INDIVIDUAL WAVE
  // ==========================================================

  drawWave(
    ctx,
    width,
    centerY,
    phase,
    options
  ) {
    const {
      amplitude,
      frequency,
      speed,
      lineWidth,
      color
    } = options;

    ctx.beginPath();

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    for (let x = 0; x < width; x++) {
      const movement =
        phase * speed;

      const modulation =
        0.55 +
        0.45 *
          Math.sin(
            phase * 0.025
          );

      const y =
        centerY +
        Math.sin(
          x * frequency + movement
        ) *
          amplitude *
          modulation;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  // ==========================================================
  // STOP WAVEFORM
  // ==========================================================

  stopWaveformAnimation() {
    if (this.waveformAnimId !== null) {
      cancelAnimationFrame(
        this.waveformAnimId
      );

      this.waveformAnimId = null;
    }

    this.clearWaveform();
  }

  // ==========================================================
  // CLEAR WAVEFORM
  // ==========================================================

  clearWaveform() {
    if (
      !this.waveformCtx ||
      !this.waveformCanvas
    ) {
      return;
    }

    this.waveformCtx.clearRect(
      0,
      0,
      this.waveformCanvas.width,
      this.waveformCanvas.height
    );
  }

  // ==========================================================
  // WEB AUDIO INITIALIZATION
  // ==========================================================

  initAudioContext() {
    if (this.audioContext) {
      return this.audioContext;
    }

    if (typeof window === "undefined") {
      return null;
    }

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {
      return null;
    }

    this.audioContext =
      new AudioContext();

    this.masterGain =
      this.audioContext.createGain();

    this.masterGain.gain.value =
      this.masterVolume;

    this.masterGain.connect(
      this.audioContext.destination
    );

    return this.audioContext;
  }

  // ==========================================================
  // RESUME AUDIO CONTEXT
  // ==========================================================

  async resumeAudioContext() {
    const context =
      this.initAudioContext();

    if (!context) return;

    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch (error) {
        console.warn(
          "Could not resume AudioContext:",
          error
        );
      }
    }
  }

  // ==========================================================
  // SOUND ENABLE / DISABLE
  // ==========================================================

  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
  }

  toggleSound() {
    this.soundEnabled =
      !this.soundEnabled;

    return this.soundEnabled;
  }

  // ==========================================================
  // MASTER VOLUME
  // ==========================================================

  setVolume(volume) {
    const value = Math.max(
      0,
      Math.min(1, Number(volume))
    );

    this.masterVolume = value;

    if (this.masterGain) {
      this.masterGain.gain.value =
        value;
    }
  }

  // ==========================================================
  // GAME SOUND EFFECTS
  // ==========================================================

  /**
   * Play a game sound effect.
   *
   * Supported:
   *  - click
   *  - button
   *  - move
   *  - capture
   *  - win
   *  - success
   *  - error
   *  - notification
   *  - dice
   *  - throw
   *  - select
   *  - start
   *
   * @param {string} name
   */

  playEffect(name) {
    if (!this.soundEnabled) {
      return;
    }

    const context =
      this.initAudioContext();

    if (!context || !this.masterGain) {
      return;
    }

    // Browsers may suspend AudioContext
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    switch (String(name).toLowerCase()) {
      case "click":
      case "button":
        this.playClick();
        break;

      case "move":
        this.playMove();
        break;

      case "capture":
      case "kill":
        this.playCapture();
        break;

      case "win":
      case "success":
        this.playWin();
        break;

      case "error":
        this.playError();
        break;

      case "notification":
        this.playNotification();
        break;

      case "dice":
      case "throw":
      case "sticks":
        this.playThrow();
        break;

      case "select":
        this.playSelect();
        break;

      case "start":
        this.playStart();
        break;

      default:
        console.warn(
          `Unknown sound effect: ${name}`
        );
    }
  }

  // ==========================================================
  // BASIC OSCILLATOR
  // ==========================================================

  createTone(
    frequency,
    duration,
    type = "sine",
    volume = 0.15,
    startTime = 0
  ) {
    const context =
      this.initAudioContext();

    if (!context || !this.masterGain) {
      return;
    }

    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
      frequency,
      context.currentTime + startTime
    );

    gain.gain.setValueAtTime(
      0,
      context.currentTime + startTime
    );

    gain.gain.linearRampToValueAtTime(
      volume,
      context.currentTime +
        startTime +
        0.01
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime +
        startTime +
        duration
    );

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(
      context.currentTime + startTime
    );

    oscillator.stop(
      context.currentTime +
        startTime +
        duration +
        0.02
    );
  }

  // ==========================================================
  // CLICK
  // ==========================================================

  playClick() {
    this.createTone(
      700,
      0.06,
      "square",
      0.08
    );
  }

  // ==========================================================
  // SELECT
  // ==========================================================

  playSelect() {
    this.createTone(
      500,
      0.08,
      "sine",
      0.1
    );

    this.createTone(
      700,
      0.1,
      "sine",
      0.08,
      0.05
    );
  }

  // ==========================================================
  // MOVE
  // ==========================================================

  playMove() {
    this.createTone(
      280,
      0.08,
      "triangle",
      0.1
    );

    this.createTone(
      380,
      0.09,
      "triangle",
      0.08,
      0.06
    );
  }

  // ==========================================================
  // CAPTURE / KILL
  // ==========================================================

  playCapture() {
    this.createTone(
      180,
      0.15,
      "sawtooth",
      0.12
    );

    this.createTone(
      100,
      0.22,
      "triangle",
      0.1,
      0.1
    );

    this.createTone(
      520,
      0.12,
      "square",
      0.07,
      0.2
    );
  }

  // ==========================================================
  // THROW / STICKS
  // ==========================================================

  playThrow() {
    this.createTone(
      180,
      0.05,
      "square",
      0.08
    );

    this.createTone(
      250,
      0.05,
      "square",
      0.07,
      0.06
    );

    this.createTone(
      330,
      0.09,
      "triangle",
      0.09,
      0.12
    );
  }

  // ==========================================================
  // NOTIFICATION
  // ==========================================================

  playNotification() {
    this.createTone(
      660,
      0.12,
      "sine",
      0.09
    );

    this.createTone(
      880,
      0.16,
      "sine",
      0.08,
      0.12
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  playError() {
    this.createTone(
      220,
      0.12,
      "square",
      0.08
    );

    this.createTone(
      160,
      0.16,
      "square",
      0.07,
      0.1
    );
  }

  // ==========================================================
  // START GAME
  // ==========================================================

  playStart() {
    this.createTone(
      440,
      0.12,
      "triangle",
      0.08
    );

    this.createTone(
      554,
      0.12,
      "triangle",
      0.08,
      0.1
    );

    this.createTone(
      659,
      0.18,
      "triangle",
      0.1,
      0.2
    );
  }

  // ==========================================================
  // WIN
  // ==========================================================

  playWin() {
    this.createTone(
      523.25,
      0.15,
      "sine",
      0.1
    );

    this.createTone(
      659.25,
      0.15,
      "sine",
      0.1,
      0.12
    );

    this.createTone(
      783.99,
      0.18,
      "sine",
      0.1,
      0.24
    );

    this.createTone(
      1046.5,
      0.35,
      "sine",
      0.12,
      0.38
    );
  }

  // ==========================================================
  // CLEANUP
  // ==========================================================

  destroy() {
    this.stop();

    if (this.waveformAnimId !== null) {
      cancelAnimationFrame(
        this.waveformAnimId
      );

      this.waveformAnimId = null;
    }

    if (this.audioContext) {
      this.audioContext
        .close()
        .catch(() => {});

      this.audioContext = null;
      this.masterGain = null;
    }

    this.waveformCanvas = null;
    this.waveformCtx = null;
  }
}

// ============================================================
// OPTIONAL DEFAULT INSTANCE
// ============================================================

export const audioManager =
  new AudioManager();
