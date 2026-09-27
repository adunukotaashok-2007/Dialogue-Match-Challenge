import en from '../i18n/en.js';
import te from '../i18n/te.js';

export class UIManager {
  constructor() {
    this.screens = {};
    this.currentScreen = null;
    this.translations = { en, te };
    this.currentLang = 'en';
    this.avatars = ['🎤','🎵','🎶','🎸','🎹','🥁','🎺','🎻','🎼','🎧',
                     '🦊','🐱','🐶','🐸','🦁','🐼','🐨','🐯','🦄','🐲'];
    this.selectedAvatar = this.avatars[0];
  }

  init() {
    // Cache screens
    document.querySelectorAll('.screen').forEach(el => {
      this.screens[el.id] = el;
    });
    
    this.populateAvatars();
    this.applyTranslations();
  }

  showScreen(screenId) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    const screen = this.screens[`screen-${screenId}`];
    if (screen) {
      screen.classList.add('active');
      this.currentScreen = screenId;
    }
  }

  setLanguage(lang) {
    this.currentLang = lang;
    this.applyTranslations();
    
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  applyTranslations() {
    const t = this.translations[this.currentLang] || this.translations.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (t[key]) {
        el.textContent = t[key];
      }
    });
  }

  t(key, replacements = {}) {
    const t = this.translations[this.currentLang] || this.translations.en;
    let text = t[key] || key;
    for (const [k, v] of Object.entries(replacements)) {
      text = text.replace(`{${k}}`, v);
    }
    return text;
  }

  populateAvatars() {
    const grid = document.getElementById('avatar-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    this.avatars.forEach((avatar, i) => {
      const div = document.createElement('div');
      div.className = 'avatar-option' + (i === 0 ? ' selected' : '');
      div.textContent = avatar;
      div.dataset.avatar = avatar;
      div.addEventListener('click', () => {
        grid.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('selected'));
        div.classList.add('selected');
        this.selectedAvatar = avatar;
      });
      grid.appendChild(div);
    });
  }

  getSelectedAvatar() {
    return this.selectedAvatar;
  }

  // Notification
  notify(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    container.appendChild(notif);
    
    setTimeout(() => {
      notif.remove();
    }, 3000);
  }

  // Lobby rendering
  renderLobbyPlayers(players, myId) {
    const grid = document.getElementById('lobby-players');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    players.forEach(p => {
      const card = document.createElement('div');
      card.className = 'player-card';
      if (p.isReady) card.classList.add('ready');
      if (p.isHost) card.classList.add('host');
      if (!p.isConnected) card.classList.add('disconnected');
      if (p.id === myId) card.style.borderColor = 'var(--accent)';
      
      card.innerHTML = `
        <div class="avatar">${p.avatar}</div>
        <div class="name">${this.escapeHtml(p.name)}${p.id === myId ? ' (You)' : ''}</div>
        <div class="status ${p.isReady ? 'ready-status' : ''}">
          ${!p.isConnected ? '⚠️ Disconnected' : p.isReady ? '✅ Ready' : '⏳ Waiting'}
        </div>
      `;
      
      grid.appendChild(card);
    });
  }

  renderLobbyInfo(room) {
    const modeBadge = document.getElementById('lobby-mode-badge');
    const roundsBadge = document.getElementById('lobby-rounds-badge');
    const langBadge = document.getElementById('lobby-lang-badge');
    
    const modeNames = { classic: '🎯 Classic', speed: '⚡ Speed', endless: '♾️ Endless', custom: '✏️ Custom' };
    const langNames = { en: '🇬🇧 English', te: '🇮🇳 Telugu' };
    
    if (modeBadge) modeBadge.textContent = modeNames[room.gameMode] || room.gameMode;
    if (roundsBadge) roundsBadge.textContent = room.gameMode === 'endless' ? '♾️' : `${room.totalRounds} rounds`;
    if (langBadge) langBadge.textContent = langNames[room.language] || room.language;
  }

  // Game HUD
  updateHUD(round, room) {
    const hudRound = document.getElementById('hud-round');
    if (hudRound) {
      if (room.gameMode === 'endless') {
        hudRound.textContent = `Round ${room.roundNumber}`;
      } else {
        hudRound.textContent = `Round ${room.roundNumber}/${room.totalRounds}`;
      }
    }
  }

  updateMiniScores(players) {
    const container = document.getElementById('mini-scores');
    if (!container) return;
    
    container.innerHTML = players
      .sort((a, b) => (b.scores?.totalScore || 0) - (a.scores?.totalScore || 0))
      .slice(0, 4)
      .map(p => `<div class="mini-score">${p.avatar} ${p.scores?.totalScore || 0}</div>`)
      .join('');
  }

  // Timer
  updateTimer(timeLeft, totalTime) {
    const text = document.getElementById('timer-text');
    const circle = document.getElementById('timer-circle');
    
    if (text) text.textContent = timeLeft;
    
    if (circle) {
      const circumference = 2 * Math.PI * 45;
      const offset = circumference * (1 - timeLeft / totalTime);
      circle.style.strokeDashoffset = offset;
      
      circle.classList.remove('warning', 'danger');
      if (timeLeft <= 3) {
        circle.classList.add('danger');
      } else if (timeLeft <= 5) {
        circle.classList.add('warning');
      }
    }
  }

  // Phase display
  setPhase(phase, lang) {
    const icon = document.getElementById('phase-icon');
    const text = document.getElementById('phase-text');
    
    const phases = {
      listen: { icon: '🔊', textKey: 'listening' },
      prepare: { icon: '🧠', textKey: 'preparing' },
      speak: { icon: '🎤', textKey: 'speaking' }
    };
    
    const p = phases[phase];
    if (!p) return;
    
    if (icon) icon.textContent = p.icon;
    if (text) text.textContent = this.t(p.textKey);
  }

  // Current player bar
  setCurrentPlayer(player, isMe) {
    const avatar = document.getElementById('current-player-avatar');
    const name = document.getElementById('current-player-name');
    const label = document.getElementById('current-player-label');
    
    if (avatar) avatar.textContent = player.avatar;
    if (name) name.textContent = player.name;
    if (label) label.textContent = isMe ? ` - ${this.t('yourTurn')}` : ` ${this.t('isSpeaking')}`;
    
    const bar = document.getElementById('current-player-bar');
    if (bar) {
      bar.style.borderColor = isMe ? 'var(--accent)' : 'var(--border)';
    }
  }

  // Waiting overlay
  showWaiting(playerName) {
    const overlay = document.getElementById('waiting-overlay');
    const watchingEl = document.getElementById('watching-player');
    
    if (overlay) overlay.classList.remove('hidden');
    if (watchingEl) watchingEl.textContent = `${this.t('watching')}${playerName}`;
  }

  hideWaiting() {
    const overlay = document.getElementById('waiting-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // Dialogue
  setDialogue(text) {
    const el = document.getElementById('dialogue-text');
    if (el) el.textContent = text;
  }

  // Mic area
  showMicArea() {
    const area = document.getElementById('mic-area');
    if (area) area.classList.remove('hidden');
  }

  hideMicArea() {
    const area = document.getElementById('mic-area');
    if (area) area.classList.add('hidden');
  }

  updateSpokenText(text) {
    const el = document.getElementById('spoken-text');
    if (el) el.textContent = text || '';
  }

  // Waveform
  showWaveform() {
    const c = document.getElementById('waveform-container');
    if (c) c.classList.remove('hidden');
  }

  hideWaveform() {
    const c = document.getElementById('waveform-container');
    if (c) c.classList.add('hidden');
  }

  // Replay button
  showReplayButton() {
    const btn = document.getElementById('btn-replay-audio');
    if (btn) btn.classList.remove('hidden');
  }

  hideReplayButton() {
    const btn = document.getElementById('btn-replay-audio');
    if (btn) btn.classList.add('hidden');
  }

  // Result screen
  showResult(playerName, avatar, score, wordComparison, spokenText) {
    document.getElementById('result-avatar').textContent = avatar;
    document.getElementById('result-player-name').textContent = playerName;
    document.getElementById('result-spoken-text').textContent = spokenText || '(nothing)';
    
    // Score label
    const label = document.getElementById('score-label');
    if (score === 100) {
      label.textContent = this.t('perfect');
      label.className = 'score-label perfect';
    } else if (score >= 80) {
      label.textContent = this.t('great');
      label.className = 'score-label great';
    } else if (score >= 50) {
      label.textContent = this.t('good');
      label.className = 'score-label good';
    } else {
      label.textContent = this.t('needsPractice');
      label.className = 'score-label poor';
    }
    
    // Word comparison
    const compEl = document.getElementById('word-comparison');
    compEl.innerHTML = '';
    if (wordComparison && wordComparison.length > 0) {
      wordComparison.forEach(item => {
        const token = document.createElement('span');
        token.className = `word-token ${item.status}`;
        token.textContent = item.word;
        if (item.status === 'wrong' && item.spoken) {
          token.title = `You said: "${item.spoken}"`;
        }
        compEl.appendChild(token);
      });
    }
  }

  // Round results
  renderRoundResults(results, players, roundNumber) {
    const title = document.getElementById('round-results-title');
    if (title) title.textContent = this.t('roundResults', { n: roundNumber });
    
    const list = document.getElementById('round-results-list');
    if (!list) return;
    list.innerHTML = '';
    
    // Build sorted results
    const sorted = Object.entries(results.results || {})
      .map(([pid, data]) => {
        const player = players.find(p => p.id === pid) || { name: 'Unknown', avatar: '❓' };
        return { ...data, ...player, playerId: pid };
      })
      .sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
    
    sorted.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'round-result-item';
      div.style.animationDelay = `${idx * 0.1}s`;
      
      let rankClass = '';
      if (idx === 0) rankClass = 'gold';
      else if (idx === 1) rankClass = 'silver';
      else if (idx === 2) rankClass = 'bronze';
      
      div.innerHTML = `
        <span class="rank ${rankClass}">#${idx + 1}</span>
        <span class="rr-avatar">${item.avatar}</span>
        <span class="rr-name">${this.escapeHtml(item.name)}</span>
        <span class="rr-score">${item.matchPercentage || 0}%</span>
      `;
      
      list.appendChild(div);
    });
  }

  renderLeaderboard(leaderboard, containerId = 'leaderboard-mini') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `<h3>${this.t('totalScore')}</h3>`;
    
    leaderboard.forEach((entry, idx) => {
      const div = document.createElement('div');
      div.className = 'round-result-item';
      
      let rankClass = '';
      if (idx === 0) rankClass = 'gold';
      else if (idx === 1) rankClass = 'silver';
      else if (idx === 2) rankClass = 'bronze';
      
      div.innerHTML = `
        <span class="rank ${rankClass}">#${idx + 1}</span>
        <span class="rr-avatar">${entry.avatar}</span>
        <span class="rr-name">${this.escapeHtml(entry.name)}</span>
        <span class="rr-score">${entry.totalScore}</span>
      `;
      
      container.appendChild(div);
    });
  }

  // Game over
  renderGameOver(winner, leaderboard) {
    const winnerCard = document.getElementById('winner-card');
    if (winnerCard && winner) {
      winnerCard.innerHTML = `
        <div class="winner-avatar">${winner.avatar}</div>
        <div class="winner-name">${this.escapeHtml(winner.name)}</div>
        <div class="winner-score">${winner.totalScore} pts</div>
        <div class="winner-stats">
          ${this.t('avgMatch')}: ${winner.averageMatch}% · 
          ${this.t('bestScore')}: ${winner.bestPerformance}% · 
          ${this.t('perfectMatches')}: ${winner.perfectMatches}
        </div>
      `;
    }
    
    this.renderLeaderboard(leaderboard, 'final-leaderboard');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
