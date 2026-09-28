/**
 * SpeechRecognitionManager.js
 * ============================================================
 * Converts speech to text using the Web Speech API.
 *
 * Features:
 *  - English speech recognition
 *  - Telugu speech recognition
 *  - Interim results
 *  - Final results
 *  - Continuous recognition
 *  - Browser support detection
 *  - Text-input fallback
 *  - Start / stop / abort
 *  - Callback API
 *  - Transcript access
 */

export class SpeechRecognitionManager {
  constructor() {
    // ==========================================================
    // BROWSER SUPPORT
    // ==========================================================

    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition ||
          window.webkitSpeechRecognition
        : null;

    this.recognition = null;
    this.supported = false;

    // ==========================================================
    // STATE
    // ==========================================================

    this.isListening = false;

    this.finalTranscript = "";
    this.interimTranscript = "";

    this.currentLanguage = "en-US";

    // Prevent duplicate final callbacks
    this.hasFinished = false;

    // ==========================================================
    // CALLBACKS
    // ==========================================================

    this.onStartCallback = null;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;

    // ==========================================================
    // INITIALIZE
    // ==========================================================

    if (!SpeechRecognition) {
      console.warn(
        "Speech Recognition is not supported in this browser."
      );

      this.supported = false;
      return;
    }

    this.recognition =
      new SpeechRecognition();

    this.supported = true;

    // ==========================================================
    // RECOGNITION SETTINGS
    // ==========================================================

    // Continue listening while the user speaks.
    this.recognition.continuous = true;

    // Gives live/interim text before the sentence is finalized.
    this.recognition.interimResults = true;

    // Only return the most likely result.
    this.recognition.maxAlternatives = 1;

    this.recognition.lang =
      this.currentLanguage;

    // ==========================================================
    // EVENTS
    // ==========================================================

    this.setupEvents();
  }

  // ==========================================================
  // EVENT SETUP
  // ==========================================================

  setupEvents() {
    if (!this.recognition) {
      return;
    }

    // ----------------------------------------------------------
    // START
    // ----------------------------------------------------------

    this.recognition.onstart = () => {
      this.isListening = true;
      this.hasFinished = false;

      if (this.onStartCallback) {
        this.onStartCallback();
      }
    };

    // ----------------------------------------------------------
    // RESULT
    // ----------------------------------------------------------

    this.recognition.onresult = (event) => {
      this.interimTranscript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const result =
          event.results[i];

        if (!result || !result[0]) {
          continue;
        }

        const transcript =
          result[0].transcript;

        if (result.isFinal) {
          this.finalTranscript +=
            transcript;
        } else {
          this.interimTranscript +=
            transcript;
        }
      }

      const currentText =
        (
          this.finalTranscript +
          this.interimTranscript
        ).trim();

      const isFinal =
        this.hasFinalResult(event);

      // Main result callback
      if (this.onResultCallback) {
        this.onResultCallback(
          currentText,
          isFinal
        );
      }
    };

    // ----------------------------------------------------------
    // ERROR
    // ----------------------------------------------------------

    this.recognition.onerror = (event) => {
      console.error(
        "Speech Recognition Error:",
        event.error
      );

      this.isListening = false;

      if (this.onErrorCallback) {
        this.onErrorCallback(
          event.error,
          event
        );
      }
    };

    // ----------------------------------------------------------
    // END
    // ----------------------------------------------------------

    this.recognition.onend = () => {
      this.isListening = false;

      const finalText =
        this.getTranscript();

      if (this.onEndCallback) {
        this.onEndCallback(
          finalText
        );
      }
    };
  }

  // ==========================================================
  // CHECK IF EVENT CONTAINS FINAL RESULT
  // ==========================================================

  hasFinalResult(event) {
    if (!event || !event.results) {
      return false;
    }

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      if (
        event.results[i] &&
        event.results[i].isFinal
      ) {
        return true;
      }
    }

    return false;
  }

  // ==========================================================
  // SET LANGUAGE
  // ==========================================================

  setLanguage(lang = "en") {
    if (!this.supported || !this.recognition) {
      return;
    }

    if (
      lang === "te" ||
      lang === "te-IN" ||
      String(lang)
        .toLowerCase()
        .startsWith("te")
    ) {
      this.currentLanguage =
        "te-IN";
    } else {
      this.currentLanguage =
        "en-US";
    }

    this.recognition.lang =
      this.currentLanguage;
  }

  // ==========================================================
  // GET LANGUAGE
  // ==========================================================

  getLanguage() {
    return this.currentLanguage;
  }

  // ==========================================================
  // START RECOGNITION
  // ==========================================================

  start(
    onInterim = null,
    onFinal = null,
    lang = null
  ) {
    // --------------------------------------------------------
    // FALLBACK FOR UNSUPPORTED BROWSERS
    // --------------------------------------------------------

    if (!this.supported) {
      const text =
        window.prompt(
          "Speech recognition is not supported. Type the dialogue:"
        );

      const finalText =
        (text || "").trim();

      if (onInterim) {
        onInterim(finalText);
      }

      if (onFinal) {
        onFinal(finalText);
      }

      if (this.onResultCallback) {
        this.onResultCallback(
          finalText,
          true
        );
      }

      if (this.onEndCallback) {
        this.onEndCallback(
          finalText
        );
      }

      return false;
    }

    // --------------------------------------------------------
    // ALREADY LISTENING
    // --------------------------------------------------------

    if (this.isListening) {
      return true;
    }

    // --------------------------------------------------------
    // LANGUAGE
    // --------------------------------------------------------

    if (lang) {
      this.setLanguage(lang);
    }

    // --------------------------------------------------------
    // RESET TRANSCRIPT
    // --------------------------------------------------------

    this.finalTranscript = "";
    this.interimTranscript = "";

    this.hasFinished = false;

    // --------------------------------------------------------
    // TEMPORARY CALLBACKS
    // --------------------------------------------------------

    const originalResultCallback =
      this.onResultCallback;

    const originalEndCallback =
      this.onEndCallback;

    // Result callback used for this recording
    if (onInterim) {
      this.onResultCallback = (
        text,
        isFinal
      ) => {
        onInterim(text, isFinal);

        if (
          originalResultCallback
        ) {
          originalResultCallback(
            text,
            isFinal
          );
        }
      };
    }

    // End callback used for this recording
    if (onFinal) {
      this.onEndCallback = (
        text
      ) => {
        onFinal(text);

        if (
          originalEndCallback
        ) {
          originalEndCallback(
            text
          );
        }
      };
    }

    // --------------------------------------------------------
    // START
    // --------------------------------------------------------

    try {
      this.recognition.start();

      return true;
    } catch (error) {
      console.error(
        "Recognition start error:",
        error
      );

      this.isListening = false;

      return false;
    }
  }

  // ==========================================================
  // STOP
  // ==========================================================

  stop() {
    if (
      !this.supported ||
      !this.recognition ||
      !this.isListening
    ) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.error(
        "Recognition stop error:",
        error
      );
    }
  }

  // ==========================================================
  // ABORT
  // ==========================================================

  abort() {
    if (
      !this.supported ||
      !this.recognition
    ) {
      return;
    }

    try {
      this.recognition.abort();
    } catch (error) {
      console.error(
        "Recognition abort error:",
        error
      );
    }

    this.isListening = false;
  }

  // ==========================================================
  // GET TRANSCRIPT
  // ==========================================================

  getTranscript() {
    return (
      this.finalTranscript +
      this.interimTranscript
    ).trim();
  }

  // ==========================================================
  // GET FINAL TRANSCRIPT ONLY
  // ==========================================================

  getFinalTranscript() {
    return this.finalTranscript.trim();
  }

  // ==========================================================
  // GET INTERIM TRANSCRIPT ONLY
  // ==========================================================

  getInterimTranscript() {
    return this.interimTranscript.trim();
  }

  // ==========================================================
  // CLEAR TRANSCRIPT
  // ==========================================================

  clearTranscript() {
    this.finalTranscript = "";
    this.interimTranscript = "";
  }

  // ==========================================================
  // SUPPORT CHECK
  // ==========================================================

  isSupported() {
    return this.supported;
  }

  // ==========================================================
  // CALLBACK: START
  // ==========================================================

  onStart(callback) {
    this.onStartCallback =
      typeof callback === "function"
        ? callback
        : null;

    return this;
  }

  // ==========================================================
  // CALLBACK: RESULT
  // ==========================================================

  onResult(callback) {
    this.onResultCallback =
      typeof callback === "function"
        ? callback
        : null;

    return this;
  }

  // ==========================================================
  // CALLBACK: ERROR
  // ==========================================================

  onError(callback) {
    this.onErrorCallback =
      typeof callback === "function"
        ? callback
        : null;

    return this;
  }

  // ==========================================================
  // CALLBACK: END
  // ==========================================================

  onEnd(callback) {
    this.onEndCallback =
      typeof callback === "function"
        ? callback
        : null;

    return this;
  }

  // ==========================================================
  // REMOVE ALL CALLBACKS
  // ==========================================================

  clearCallbacks() {
    this.onStartCallback = null;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;
  }

  // ==========================================================
  // DESTROY
  // ==========================================================

  destroy() {
    this.abort();

    this.clearTranscript();
    this.clearCallbacks();

    this.recognition = null;
    this.supported = false;
    this.isListening = false;
  }
}

// Optional shared instance
export const speechRecognitionManager =
  new SpeechRecognitionManager();
