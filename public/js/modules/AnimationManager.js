/**
 * AnimationManager.js
 * ============================================================
 * Handles UI animations, particles, countdowns, score effects,
 * confetti, and celebration feedback.
 */

export class AnimationManager {
  constructor() {
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.resizeHandler = null;

    this.isParticleAnimationRunning = false;
  }

  // ==========================================================
  // SHAKE ELEMENT
  // ==========================================================

  static shake(elementId) {
    const element =
      typeof elementId === "string"
        ? document.getElementById(elementId)
        : elementId;

    if (!element) return;

    // Restart animation if already active
    element.classList.remove(
      "shake-animation"
    );

    void element.offsetWidth;

    element.classList.add(
      "shake-animation"
    );

    setTimeout(() => {
      element.classList.remove(
        "shake-animation"
      );
    }, 500);
  }

  // ==========================================================
  // BOUNCE ELEMENT
  // ==========================================================

  static bounce(elementId) {
    const element =
      typeof elementId === "string"
        ? document.getElementById(elementId)
        : elementId;

    if (!element) return;

    element.classList.remove(
      "bounce-animation"
    );

    void element.offsetWidth;

    element.classList.add(
      "bounce-animation"
    );

    setTimeout(() => {
      element.classList.remove(
        "bounce-animation"
      );
    }, 500);
  }

  // ==========================================================
  // SIMPLE CELEBRATION
  // ==========================================================

  static showConfetti() {
    document.body.classList.add(
      "celebration"
    );

    setTimeout(() => {
      document.body.classList.remove(
        "celebration"
      );
    }, 3000);
  }

  // ==========================================================
  // INITIALIZE PARTICLE BACKGROUND
  // ==========================================================

  initParticles(canvas) {
    if (!canvas) {
      console.warn(
        "AnimationManager: Particle canvas not found."
      );
      return;
    }

    // Destroy previous particle animation
    this.stopParticles();

    this.canvas = canvas;
    this.ctx =
      canvas.getContext("2d");

    if (!this.ctx) {
      console.warn(
        "AnimationManager: Canvas 2D context unavailable."
      );
      return;
    }

    this.resizeCanvas();

    // Avoid accumulating resize listeners
    this.resizeHandler = () => {
      this.resizeCanvas();
    };

    window.addEventListener(
      "resize",
      this.resizeHandler
    );

    this.particles = [];

    // Create particles
    const particleCount = 50;

    for (
      let i = 0;
      i < particleCount;
      i++
    ) {
      this.particles.push(
        this.createParticle()
      );
    }

    this.isParticleAnimationRunning =
      true;

    this.animateParticles();
  }

  // ==========================================================
  // RESIZE CANVAS
  // ==========================================================

  resizeCanvas() {
    if (!this.canvas) return;

    const dpr =
      window.devicePixelRatio || 1;

    const width =
      window.innerWidth;

    const height =
      window.innerHeight;

    this.canvas.style.width =
      `${width}px`;

    this.canvas.style.height =
      `${height}px`;

    this.canvas.width =
      Math.floor(width * dpr);

    this.canvas.height =
      Math.floor(height * dpr);

    if (this.ctx) {
      this.ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );
    }
  }

  // ==========================================================
  // CREATE PARTICLE
  // ==========================================================

  createParticle() {
    const colors = [
      "108,92,231",
      "253,121,168",
      "0,206,201"
    ];

    return {
      x:
        Math.random() *
        (window.innerWidth || 800),

      y:
        Math.random() *
        (window.innerHeight || 600),

      vx:
        (Math.random() - 0.5) *
        0.5,

      vy:
        (Math.random() - 0.5) *
        0.5,

      radius:
        Math.random() * 2 + 1,

      alpha:
        Math.random() * 0.3 + 0.1,

      color:
        colors[
          Math.floor(
            Math.random() *
              colors.length
          )
        ]
    };
  }

  // ==========================================================
  // PARTICLE ANIMATION
  // ==========================================================

  animateParticles() {
    if (
      !this.ctx ||
      !this.canvas ||
      !this.isParticleAnimationRunning
    ) {
      return;
    }

    const ctx = this.ctx;

    const width =
      window.innerWidth;

    const height =
      window.innerHeight;

    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    // ========================================================
    // DRAW PARTICLES
    // ========================================================

    this.particles.forEach(
      (particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around screen
        if (particle.x < 0) {
          particle.x = width;
        }

        if (particle.x > width) {
          particle.x = 0;
        }

        if (particle.y < 0) {
          particle.y = height;
        }

        if (particle.y > height) {
          particle.y = 0;
        }

        ctx.beginPath();

        ctx.arc(
          particle.x,
          particle.y,
          particle.radius,
          0,
          Math.PI * 2
        );

        ctx.fillStyle =
          `rgba(${particle.color},${particle.alpha})`;

        ctx.fill();
      }
    );

    // ========================================================
    // DRAW CONNECTIONS
    // ========================================================

    for (
      let i = 0;
      i < this.particles.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < this.particles.length;
        j++
      ) {
        const first =
          this.particles[i];

        const second =
          this.particles[j];

        const dx =
          first.x - second.x;

        const dy =
          first.y - second.y;

        const distance =
          Math.sqrt(
            dx * dx +
              dy * dy
          );

        const maxDistance = 120;

        if (
          distance <
          maxDistance
        ) {
          const opacity =
            0.05 *
            (
              1 -
              distance /
                maxDistance
            );

          ctx.beginPath();

          ctx.moveTo(
            first.x,
            first.y
          );

          ctx.lineTo(
            second.x,
            second.y
          );

          ctx.strokeStyle =
            `rgba(108,92,231,${opacity})`;

          ctx.lineWidth = 0.5;

          ctx.stroke();
        }
      }
    }

    this.animId =
      requestAnimationFrame(
        () =>
          this.animateParticles()
      );
  }

  // ==========================================================
  // STOP PARTICLES
  // ==========================================================

  stopParticles() {
    this.isParticleAnimationRunning =
      false;

    if (this.animId !== null) {
      cancelAnimationFrame(
        this.animId
      );

      this.animId = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener(
        "resize",
        this.resizeHandler
      );

      this.resizeHandler = null;
    }

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
    }
  }

  // ==========================================================
  // SHOW COUNTDOWN NUMBER
  // ==========================================================

  showCountdown(number) {
    return new Promise(
      (resolve) => {
        const element =
          document.createElement(
            "div"
          );

        element.className =
          "countdown-number";

        element.textContent =
          String(number);

        document.body.appendChild(
          element
        );

        setTimeout(() => {
          element.remove();
          resolve();
        }, 900);
      }
    );
  }

  // ==========================================================
  // COUNTDOWN SEQUENCE
  // ==========================================================

  async showCountdownSequence(
    from = 3
  ) {
    const start =
      Math.max(
        1,
        Math.floor(
          Number(from) || 3
        )
      );

    for (
      let number = start;
      number >= 1;
      number--
    ) {
      await this.showCountdown(
        number
      );
    }
  }

  // ==========================================================
  // SHOW SCORE POPUP
  // ==========================================================

  showScorePopup(score) {
    const safeScore =
      Math.min(
        100,
        Math.max(
          0,
          Math.round(
            Number(score) || 0
          )
        )
      );

    const element =
      document.createElement(
        "div"
      );

    element.className =
      "score-popup";

    if (safeScore === 100) {
      element.textContent =
        `🎯 ${safeScore}%`;

      element.style.color =
        "#00b894";
    } else if (
      safeScore >= 80
    ) {
      element.textContent =
        `🌟 ${safeScore}%`;

      element.style.color =
        "#55efc4";
    } else if (
      safeScore >= 50
    ) {
      element.textContent =
        `${safeScore}%`;

      element.style.color =
        "#fdcb6e";
    } else {
      element.textContent =
        `${safeScore}%`;

      element.style.color =
        "#d63031";
    }

    document.body.appendChild(
      element
    );

    setTimeout(() => {
      element.remove();
    }, 1500);
  }

  // ==========================================================
  // SHOW CONFETTI
  // ==========================================================

  showConfetti(container = null) {
    const target =
      container ||
      document.body;

    if (!target) return;

    const colors = [
      "#6c5ce7",
      "#fd79a8",
      "#00cec9",
      "#fdcb6e",
      "#ff6b6b",
      "#a29bfe",
      "#55efc4"
    ];

    const fragment =
      document.createDocumentFragment();

    for (
      let i = 0;
      i < 80;
      i++
    ) {
      const piece =
        document.createElement(
          "div"
        );

      piece.className =
        "confetti-piece";

      piece.style.left =
        `${Math.random() * 100}%`;

      piece.style.backgroundColor =
        colors[
          Math.floor(
            Math.random() *
              colors.length
          )
        ];

      piece.style.animationDuration =
        `${2 + Math.random() * 3}s`;

      piece.style.animationDelay =
        `${Math.random() * 2}s`;

      if (
        Math.random() > 0.5
      ) {
        piece.style.borderRadius =
          "50%";
      }

      piece.style.width =
        `${5 + Math.random() * 10}px`;

      piece.style.height =
        `${5 + Math.random() * 10}px`;

      fragment.appendChild(
        piece
      );
    }

    target.appendChild(
      fragment
    );

    // Cleanup
    setTimeout(() => {
      if (
        target &&
        target.contains
      ) {
        const pieces =
          target.querySelectorAll(
            ".confetti-piece"
          );

        pieces.forEach(
          (piece) => {
            piece.remove();
          }
        );
      }
    }, 6000);
  }

  // ==========================================================
  // ANIMATE SCORE NUMBER
  // ==========================================================

  animateScore(
    element,
    targetScore,
    duration = 1500
  ) {
    if (!element) return;

    const safeTarget =
      Math.min(
        100,
        Math.max(
          0,
          Number(targetScore) || 0
        )
      );

    const safeDuration =
      Math.max(
        0,
        Number(duration) || 1500
      );

    const startTime =
      performance.now();

    const animate = (
      currentTime
    ) => {
      const elapsed =
        currentTime -
        startTime;

      const progress =
        safeDuration === 0
          ? 1
          : Math.min(
              elapsed /
                safeDuration,
              1
            );

      // Ease-out cubic
      const eased =
        1 -
        Math.pow(
          1 - progress,
          3
        );

      const currentScore =
        Math.round(
          eased *
            safeTarget
        );

      element.textContent =
        `${currentScore}%`;

      if (
        progress < 1
      ) {
        requestAnimationFrame(
          animate
        );
      }
    };

    requestAnimationFrame(
      animate
    );
  }

  // ==========================================================
  // ANIMATE SCORE CIRCLE
  // ==========================================================

  animateScoreCircle(
    circleElement,
    targetScore,
    radius = 90
  ) {
    if (!circleElement) {
      return;
    }

    const safeScore =
      Math.min(
        100,
        Math.max(
          0,
          Number(targetScore) || 0
        )
      );

    const circumference =
      2 *
      Math.PI *
      radius;

    const targetOffset =
      circumference -
      (
        safeScore / 100
      ) *
        circumference;

    // Set SVG stroke length
    circleElement.style.strokeDasharray =
      `${circumference}`;

    // Start from empty
    circleElement.style.strokeDashoffset =
      `${circumference}`;

    // Score color
    if (
      safeScore >= 90
    ) {
      circleElement.style.stroke =
        "#00b894";
    } else if (
      safeScore >= 70
    ) {
      circleElement.style.stroke =
        "#55efc4";
    } else if (
      safeScore >= 50
    ) {
      circleElement.style.stroke =
        "#fdcb6e";
    } else {
      circleElement.style.stroke =
        "#d63031";
    }

    // Allow browser to render initial state
    requestAnimationFrame(
      () => {
        circleElement.style.strokeDashoffset =
          `${targetOffset}`;
      }
    );
  }

  // ==========================================================
  // COMBINED SUCCESS EFFECT
  // ==========================================================

  celebrate(
    score = 100,
    container = null
  ) {
    this.showScorePopup(
      score
    );

    this.showConfetti(
      container
    );

    document.body.classList.add(
      "celebration"
    );

    setTimeout(() => {
      document.body.classList.remove(
        "celebration"
      );
    }, 3000);
  }

  // ==========================================================
  // DESTROY
  // ==========================================================

  destroy() {
    this.stopParticles();

    this.particles = [];

    this.canvas = null;
    this.ctx = null;
  }
}

// Optional shared instance
export const animationManager =
  new AnimationManager();
