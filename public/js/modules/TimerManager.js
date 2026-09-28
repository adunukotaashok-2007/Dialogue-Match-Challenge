/**
 * TimerManager.js
 * ============================================================
 * Handles game countdown timers.
 *
 * Features:
 *  - Start countdown
 *  - Stop countdown
 *  - Pause / resume
 *  - Reset
 *  - Tick callback
 *  - Completion callback
 *  - Get remaining time
 *  - Get total time
 *  - Get progress
 *  - Prevents duplicate timers
 */

export class TimerManager {
  constructor() {
    this.interval = null;

    this.timeLeft = 0;
    this.totalTime = 0;

    this.isRunning = false;
    this.isPaused = false;

    this.onTickCallback = null;
    this.onCompleteCallback = null;
  }

  // ==========================================================
  // START TIMER
  // ==========================================================

  /**
   * Start a countdown.
   *
   * @param {number} seconds
   * @param {Function|null} onTick
   * @param {Function|null} onComplete
   */

  start(
    seconds,
    onTick = null,
    onComplete = null
  ) {
    this.stop();

    const duration =
      Math.max(
        0,
        Math.floor(
          Number(seconds) || 0
        )
      );

    this.timeLeft = duration;
    this.totalTime = duration;

    this.onTickCallback =
      typeof onTick === "function"
        ? onTick
        : null;

    this.onCompleteCallback =
      typeof onComplete === "function"
        ? onComplete
        : null;

    this.isPaused = false;

    // Immediately update UI
    if (this.onTickCallback) {
      this.onTickCallback(
        this.timeLeft,
        this.totalTime
      );
    }

    // No timer required for zero seconds
    if (this.timeLeft <= 0) {
      this.isRunning = false;

      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }

      return;
    }

    this.isRunning = true;

    this.interval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  // ==========================================================
  // TICK
  // ==========================================================

  tick() {
    if (
      !this.isRunning ||
      this.isPaused
    ) {
      return;
    }

    this.timeLeft--;

    if (this.onTickCallback) {
      this.onTickCallback(
        this.timeLeft,
        this.totalTime
      );
    }

    if (this.timeLeft <= 0) {
      const callback =
        this.onCompleteCallback;

      this.stop();

      if (callback) {
        callback();
      }
    }
  }

  // ==========================================================
  // STOP
  // ==========================================================

  stop() {
    if (this.interval !== null) {
      clearInterval(
        this.interval
      );

      this.interval = null;
    }

    this.isRunning = false;
    this.isPaused = false;
  }

  // ==========================================================
  // PAUSE
  // ==========================================================

  pause() {
    if (
      !this.isRunning ||
      this.isPaused
    ) {
      return;
    }

    this.isPaused = true;
  }

  // ==========================================================
  // RESUME
  // ==========================================================

  resume() {
    if (
      !this.isRunning ||
      !this.isPaused
    ) {
      return;
    }

    this.isPaused = false;
  }

  // ==========================================================
  // RESET
  // ==========================================================

  reset() {
    this.stop();

    this.timeLeft =
      this.totalTime;
  }

  // ==========================================================
  // RESTART
  // ==========================================================

  restart() {
    const seconds =
      this.totalTime;

    const onTick =
      this.onTickCallback;

    const onComplete =
      this.onCompleteCallback;

    this.start(
      seconds,
      onTick,
      onComplete
    );
  }

  // ==========================================================
  // GET TIME LEFT
  // ==========================================================

  getTimeLeft() {
    return this.timeLeft;
  }

  // ==========================================================
  // GET TOTAL TIME
  // ==========================================================

  getTotalTime() {
    return this.totalTime;
  }

  // ==========================================================
  // GET PROGRESS
  // ==========================================================

  /**
   * Returns elapsed progress from 0 to 1.
   *
   * Example:
   * 10 seconds total
   * 5 seconds remaining
   * => 0.5 elapsed
   */

  getProgress() {
    if (this.totalTime <= 0) {
      return 1;
    }

    return Math.min(
      1,
      Math.max(
        0,
        1 -
          this.timeLeft /
            this.totalTime
      )
    );
  }

  // ==========================================================
  // GET REMAINING RATIO
  // ==========================================================

  getRemainingRatio() {
    if (this.totalTime <= 0) {
      return 0;
    }

    return Math.min(
      1,
      Math.max(
        0,
        this.timeLeft /
          this.totalTime
      )
    );
  }

  // ==========================================================
  // CHECK RUNNING
  // ==========================================================

  isActive() {
    return this.isRunning;
  }

  // ==========================================================
  // CHECK PAUSED
  // ==========================================================

  isPausedState() {
    return this.isPaused;
  }

  // ==========================================================
  // ADD TIME
  // ==========================================================

  addTime(seconds) {
    const amount =
      Math.floor(
        Number(seconds) || 0
      );

    this.timeLeft += amount;
    this.totalTime += amount;

    if (this.onTickCallback) {
      this.onTickCallback(
        this.timeLeft,
        this.totalTime
      );
    }
  }

  // ==========================================================
  // SET TIME
  // ==========================================================

  setTime(seconds) {
    const duration =
      Math.max(
        0,
        Math.floor(
          Number(seconds) || 0
        )
      );

    this.timeLeft = duration;
    this.totalTime = duration;

    if (this.onTickCallback) {
      this.onTickCallback(
        this.timeLeft,
        this.totalTime
      );
    }
  }

  // ==========================================================
  // FORMAT TIME
  // ==========================================================

  /**
   * Converts seconds into MM:SS.
   *
   * Example:
   * 65 -> "01:05"
   */

  formatTime(seconds = this.timeLeft) {
    const safeSeconds =
      Math.max(
        0,
        Math.floor(
          Number(seconds) || 0
        )
      );

    const minutes =
      Math.floor(
        safeSeconds / 60
      );

    const secondsPart =
      safeSeconds % 60;

    return (
      String(minutes).padStart(
        2,
        "0"
      ) +
      ":" +
      String(secondsPart).padStart(
        2,
        "0"
      )
    );
  }

  // ==========================================================
  // CLEAR CALLBACKS
  // ==========================================================

  clearCallbacks() {
    this.onTickCallback = null;
    this.onCompleteCallback = null;
  }

  // ==========================================================
  // DESTROY
  // ==========================================================

  destroy() {
    this.stop();

    this.clearCallbacks();

    this.timeLeft = 0;
    this.totalTime = 0;
  }
}

// Optional shared instance
export const timerManager =
  new TimerManager();
