/**
 * MicrophoneManager.js
 * ============================================================
 * Handles:
 *  - Microphone permission
 *  - Audio stream management
 *  - Recording state
 *  - Noise suppression / echo cancellation
 *  - Microphone level visualization
 *  - Start / stop recording
 *  - AudioContext cleanup
 */

export class MicrophoneManager {
  constructor() {
    this.stream = null;
    this.isRecording = false;
    this.isInitialized = false;

    this.audioContext = null;
    this.analyser = null;
    this.source = null;

    this.animId = null;
    this.currentMicIndicator = null;
  }

  // ==========================================================
  // REQUEST MICROPHONE ACCESS
  // ==========================================================

  async requestAccess() {
    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        console.error(
          "Microphone access is not supported by this browser."
        );
        return false;
      }

      // Stop any previous stream first
      this.stop();

      this.stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

      this.isInitialized = true;

      return true;
    } catch (error) {
      console.error(
        "Microphone access denied:",
        error
      );

      this.stream = null;
      this.isInitialized = false;

      return false;
    }
  }

  // ==========================================================
  // BACKWARD-COMPATIBLE PERMISSION METHOD
  // ==========================================================

  async requestPermission() {
    return this.requestAccess();
  }

  // ==========================================================
  // CHECK MICROPHONE AVAILABILITY
  // ==========================================================

  hasAccess() {
    return !!(
      this.stream &&
      this.stream.active
    );
  }

  // ==========================================================
  // START RECORDING / VISUALIZATION
  // ==========================================================

  async startRecording(micIndicator = null) {
    if (!this.stream) {
      const granted =
        await this.requestAccess();

      if (!granted) {
        return false;
      }
    }

    if (this.isRecording) {
      return true;
    }

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) {
        console.error(
          "Web Audio API is not supported."
        );
        return false;
      }

      this.audioContext =
        new AudioContext();

      // Some browsers initially suspend AudioContext.
      if (
        this.audioContext.state ===
        "suspended"
      ) {
        await this.audioContext.resume();
      }

      this.source =
        this.audioContext.createMediaStreamSource(
          this.stream
        );

      this.analyser =
        this.audioContext.createAnalyser();

      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source.connect(
        this.analyser
      );

      this.isRecording = true;
      this.currentMicIndicator =
        micIndicator || null;

      if (micIndicator) {
        micIndicator.classList.add(
          "recording"
        );

        this.animateMicLevel(
          micIndicator
        );
      }

      return true;
    } catch (error) {
      console.error(
        "Could not start microphone:",
        error
      );

      this.isRecording = false;

      return false;
    }
  }

  // ==========================================================
  // MICROPHONE LEVEL ANIMATION
  // ==========================================================

  animateMicLevel(micIndicator) {
    if (
      !this.analyser ||
      !this.isRecording ||
      !micIndicator
    ) {
      return;
    }

    // Cancel an existing animation
    if (this.animId !== null) {
      cancelAnimationFrame(
        this.animId
      );

      this.animId = null;
    }

    const dataArray =
      new Uint8Array(
        this.analyser.frequencyBinCount
      );

    const check = () => {
      if (
        !this.isRecording ||
        !this.analyser
      ) {
        return;
      }

      this.analyser.getByteFrequencyData(
        dataArray
      );

      let total = 0;

      for (
        let i = 0;
        i < dataArray.length;
        i++
      ) {
        total += dataArray[i];
      }

      const average =
        dataArray.length > 0
          ? total / dataArray.length
          : 0;

      // Convert microphone volume into a
      // smooth scale value.
      const scale =
        1 + (average / 255) * 0.35;

      const icon =
        micIndicator.querySelector(
          ".mic-icon"
        );

      if (icon) {
        icon.style.transform =
          `scale(${scale})`;
      }

      // Optional CSS variable for advanced
      // microphone animations.
      micIndicator.style.setProperty(
        "--mic-level",
        String(average / 255)
      );

      this.animId =
        requestAnimationFrame(check);
    };

    check();
  }

  // ==========================================================
  // STOP RECORDING
  // ==========================================================

  stopRecording(micIndicator = null) {
    this.isRecording = false;

    const indicator =
      micIndicator ||
      this.currentMicIndicator;

    if (indicator) {
      indicator.classList.remove(
        "recording"
      );

      const icon =
        indicator.querySelector(
          ".mic-icon"
        );

      if (icon) {
        icon.style.transform =
          "scale(1)";
      }

      indicator.style.setProperty(
        "--mic-level",
        "0"
      );
    }

    this.currentMicIndicator = null;

    // Stop animation
    if (this.animId !== null) {
      cancelAnimationFrame(
        this.animId
      );

      this.animId = null;
    }

    // Disconnect analyser/source
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (_) {}

      this.source = null;
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (_) {}

      this.analyser = null;
    }

    // Close AudioContext
    if (this.audioContext) {
      this.audioContext
        .close()
        .catch(() => {});

      this.audioContext = null;
    }
  }

  // ==========================================================
  // STOP MICROPHONE STREAM
  // ==========================================================

  stop() {
    this.stopRecording();

    if (this.stream) {
      this.stream
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      this.stream = null;
    }

    this.isInitialized = false;
  }

  // ==========================================================
  // RELEASE EVERYTHING
  // ==========================================================

  release() {
    this.stop();
  }

  // ==========================================================
  // GET CURRENT STREAM
  // ==========================================================

  getStream() {
    return this.stream;
  }

  // ==========================================================
  // GET MICROPHONE RECORDING STATE
  // ==========================================================

  getRecordingState() {
    return this.isRecording;
  }

  // ==========================================================
  // DESTROY MANAGER
  // ==========================================================

  destroy() {
    this.release();

    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.currentMicIndicator = null;
    this.isInitialized = false;
    this.isRecording = false;
  }
}

// Optional shared instance
export const microphoneManager =
  new MicrophoneManager();
