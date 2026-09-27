export class TimerManager {
  constructor() {
    this.interval = null;
    this.timeLeft = 0;
    this.totalTime = 0;
    this.onTick = null;
    this.onComplete = null;
  }

  start(seconds, onTick, onComplete) {
    this.stop();
    this.timeLeft = seconds;
    this.totalTime = seconds;
    this.onTick = onTick;
    this.onComplete = onComplete;

    if (onTick) onTick(this.timeLeft, this.totalTime);

    this.interval = setInterval(() => {
      this.timeLeft--;
      if (this.onTick) this.onTick(this.timeLeft, this.totalTime);
      
      if (this.timeLeft <= 0) {
        this.stop();
        if (this.onComplete) this.onComplete();
      }
    }, 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getTimeLeft() {
    return this.timeLeft;
  }
}
