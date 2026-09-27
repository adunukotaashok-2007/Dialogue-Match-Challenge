export class AnimationManager {
  constructor() {
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
    this.animId = null;
  }

  initParticles(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();
    
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Create particles
    for (let i = 0; i < 50; i++) {
      this.particles.push(this.createParticle());
    }
    
    this.animateParticles();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticle() {
    return {
      x: Math.random() * (this.canvas?.width || 800),
      y: Math.random() * (this.canvas?.height || 600),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1,
      alpha: Math.random() * 0.3 + 0.1,
      color: ['108,92,231', '253,121,168', '0,206,201'][Math.floor(Math.random() * 3)]
    };
  }

  animateParticles() {
    if (!this.ctx || !this.canvas) return;
    
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
    });
    
    // Draw connections
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(this.particles[i].x, this.particles[i].y);
          ctx.lineTo(this.particles[j].x, this.particles[j].y);
          ctx.strokeStyle = `rgba(108,92,231,${0.05 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    
    this.animId = requestAnimationFrame(() => this.animateParticles());
  }

  showCountdown(number) {
    return new Promise(resolve => {
      const el = document.createElement('div');
      el.className = 'countdown-number';
      el.textContent = number;
      document.body.appendChild(el);
      
      setTimeout(() => {
        el.remove();
        resolve();
      }, 900);
    });
  }

  async showCountdownSequence(from = 3) {
    for (let i = from; i >= 1; i--) {
      await this.showCountdown(i);
    }
  }

  showScorePopup(score) {
    const el = document.createElement('div');
    el.className = 'score-popup';
    
    let color, text;
    if (score === 100) {
      color = '#00b894';
      text = `🎯 ${score}%`;
    } else if (score >= 80) {
      color = '#55efc4';
      text = `🌟 ${score}%`;
    } else if (score >= 50) {
      color = '#fdcb6e';
      text = `${score}%`;
    } else {
      color = '#d63031';
      text = `${score}%`;
    }
    
    el.textContent = text;
    el.style.color = color;
    document.body.appendChild(el);
    
    setTimeout(() => el.remove(), 1500);
  }

  showConfetti(container) {
    const colors = ['#6c5ce7', '#fd79a8', '#00cec9', '#fdcb6e', '#ff6b6b', '#a29bfe', '#55efc4'];
    
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (2 + Math.random() * 3) + 's';
      piece.style.animationDelay = Math.random() * 2 + 's';
      
      if (Math.random() > 0.5) {
        piece.style.borderRadius = '50%';
      }
      
      piece.style.width = (5 + Math.random() * 10) + 'px';
      piece.style.height = (5 + Math.random() * 10) + 'px';
      
      container.appendChild(piece);
    }
    
    // Cleanup after animation
    setTimeout(() => {
      container.innerHTML = '';
    }, 6000);
  }

  animateScore(element, targetScore, duration = 1500) {
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(eased * targetScore);
      
      element.textContent = currentScore + '%';
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  animateScoreCircle(circleElement, targetScore) {
    const circumference = 2 * Math.PI * 90; // r=90 as in SVG
    const targetOffset = circumference - (targetScore / 100) * circumference;
    
    // Set color based on score
    if (targetScore >= 90) {
      circleElement.style.stroke = '#00b894';
    } else if (targetScore >= 70) {
      circleElement.style.stroke = '#55efc4';
    } else if (targetScore >= 50) {
      circleElement.style.stroke = '#fdcb6e';
    } else {
      circleElement.style.stroke = '#d63031';
    }
    
    // Trigger animation
    setTimeout(() => {
      circleElement.style.strokeDashoffset = targetOffset;
    }, 100);
  }

  destroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
    }
  }
}
