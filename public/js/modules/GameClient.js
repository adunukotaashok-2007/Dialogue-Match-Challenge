import { AudioManager } from './AudioManager.js';
import { MicrophoneManager } from './MicrophoneManager.js';
import { SpeechRecognitionManager } from './SpeechRecognitionManager.js';
import { SpeechComparison } from './SpeechComparison.js';
import { TimerManager } from './TimerManager.js';
import { AnimationManager } from './AnimationManager.js';
import { UIManager } from './UIManager.js';
import { MultiplayerClient } from './MultiplayerClient.js';

export class GameClient {
  constructor() {
    this.ui = new UIManager();
    this.audio = new AudioManager();
    this.mic = new MicrophoneManager();
    this.speech = new SpeechRecognitionManager();
    this.timer = new TimerManager();
    this.anim = new AnimationManager();
    this.mp = new MultiplayerClient();

    this.room = null;
    this.myPlayerId = null;
    this.currentDialogue = null;
    this.isMyTurn = false;
    this.language = 'en';
    this.hasSubmitted = false;
  }

  async init() {
    this.ui.init();
    
    const canvas = document.getElementById('particles-canvas');
    this.anim.initParticles(canvas);
    
    const waveformCanvas = document.getElementById('waveform-canvas');
    this.audio.init(waveformCanvas);
    
    this.mp.loadSession();
    
    try {
      await this.mp.connect();
      this.ui.notify('Connected to server!', 'success');
    } catch (e) {
      this.ui.notify('Could not connect to server. Please refresh.', 'error');
      console.error('Connection failed:', e);
    }
    
    this.bindEvents();
    this.bindSocketEvents();
    
    // Load voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }

  bindEvents() {
    // Language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.language = btn.dataset.lang;
        this.ui.setLanguage(this.language);
      });
    });

    // Create Room flow
    document.getElementById('btn-create-room').addEventListener('click', () => {
      const settings = document.getElementById('create-settings');
      const joinForm = document.getElementById('join-form');
      joinForm.classList.add('hidden');
      settings.classList.toggle('hidden');
    });

    document.getElementById('btn-create-confirm').addEventListener('click', () => this.createRoom());

    // Join Room flow
    document.getElementById('btn-join-room').addEventListener('click', () => {
      const joinForm = document.getElementById('join-form');
      const settings = document.getElementById('create-settings');
      settings.classList.add('hidden');
      joinForm.classList.toggle('hidden');
    });

    document.getElementById('btn-join-confirm').addEventListener('click', () => this.joinRoom());

    // Room code input - auto uppercase
    document.getElementById('room-code-input').addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });

    // Copy room code
    document.getElementById('btn-copy-code').addEventListener('click', () => {
      const code = document.getElementById('display-room-code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        this.ui.notify(this.ui.t('copied'), 'success');
      }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        this.ui.notify(this.ui.t('copied'), 'success');
      });
    });

    // Ready button
    const readyBtn = document.getElementById('btn-ready');
    let isReady = false;
    readyBtn.addEventListener('click', () => {
      isReady = !isReady;
      this.mp.setReady(isReady);
      readyBtn.textContent = isReady ? this.ui.t('notReady') : this.ui.t('ready');
      readyBtn.className = isReady ? 'btn btn-ghost' : 'btn btn-accent';
    });

    // Start game
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.mp.startGame();
    });

    // Leave room
    document.getElementById('btn-leave-room').addEventListener('click', () => {
      this.mp.disconnect();
      this.mp = new MultiplayerClient();
      this.mp.connect().then(() => {
        this.bindSocketEvents();
      });
      this.room = null;
      this.ui.showScreen('menu');
    });

    // Replay audio
    document.getElementById('btn-replay-audio').addEventListener('click', () => {
      if (this.currentDialogue) {
        this.ui.showWaveform();
        this.audio.speak(this.currentDialogue, this.language).then(() => {
          this.ui.hideWaveform();
        });
      }
    });

    // Next round button
    document.getElementById('btn-next-round').addEventListener('click', () => {
      this.mp.requestNextRound();
    });

    // Play again
    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.mp.requestNextRound();
    });

    // Back to menu
    document.getElementById('btn-back-menu').addEventListener('click', () => {
      this.mp.disconnect();
      this.mp = new MultiplayerClient();
      this.mp.connect().then(() => {
        this.bindSocketEvents();
      });
      this.room = null;
      this.ui.showScreen('menu');
    });

    // Custom dialogue
    document.getElementById('btn-add-dialogue').addEventListener('click', () => {
      const input = document.getElementById('custom-dialogue-input');
      const text = input.value.trim();
      if (text.length < 3) {
        this.ui.notify('Dialogue too short!', 'warning');
        return;
      }
      this.mp.addCustomDialogue(text).then(() => {
        this.ui.notify('Dialogue added!', 'success');
        input.value = '';
      }).catch(err => {
        this.ui.notify(err.message, 'error');
      });
    });

    // Enter key on room code input
    document.getElementById('room-code-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.joinRoom();
    });

    // Enter key on name input
    document.getElementById('player-name').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const settings = document.getElementById('create-settings');
        if (!settings.classList.contains('hidden')) {
          this.createRoom();
        }
      }
    });
  }

  bindSocketEvents() {
    this.mp.on('player-joined', (data) => {
      this.room = data.room;
      this.ui.renderLobbyPlayers(data.room.players, this.myPlayerId);
      this.ui.notify(`${data.player.name} joined!`, 'info');
    });

    this.mp.on('player-updated', (data) => {
      this.room = data.room;
      this.ui.renderLobbyPlayers(data.room.players, this.myPlayerId);
      
      const startBtn = document.getElementById('btn-start-game');
      const isHost = data.room.host === this.myPlayerId;
      if (isHost && data.allReady) {
        startBtn.classList.remove('hidden');
        startBtn.classList.add('glow-pulse');
      } else if (isHost) {
        startBtn.classList.remove('hidden');
        startBtn.classList.remove('glow-pulse');
        startBtn.disabled = !data.allReady;
      }
    });

    this.mp.on('player-disconnected', (data) => {
      this.room = data.room;
      this.ui.renderLobbyPlayers(data.room.players, this.myPlayerId);
      this.ui.notify(`${data.player.name} disconnected`, 'warning');
    });

    this.mp.on('player-reconnected', (data) => {
      this.room = data.room;
      this.ui.renderLobbyPlayers(data.room.players, this.myPlayerId);
      this.ui.notify(`${data.player.name} reconnected!`, 'success');
    });

    this.mp.on('reconnected', (data) => {
      this.room = data.room;
      this.myPlayerId = data.playerId;
      
      if (data.room.status === 'lobby') {
        this.ui.showScreen('lobby');
        this.setupLobby(data.room);
      } else if (data.room.status === 'playing') {
        this.ui.showScreen('game');
        this.ui.updateHUD(data.room.currentRound, data.room);
      }
    });

    this.mp.on('game-started', (data) => {
      this.room = data.room;
      this.ui.showScreen('game');
      this.ui.notify('Game started! 🎮', 'success');
    });

    this.mp.on('round-started', (data) => {
      this.room = data.room;
      this.currentDialogue = data.round.dialogue.text;
      this.hasSubmitted = false;
      
      this.ui.showScreen('game');
      this.ui.updateHUD(data.round, data.room);
      this.ui.updateMiniScores(data.room.players);
      this.ui.setDialogue(this.currentDialogue);
      this.ui.setPhase('listen', this.language);
      this.ui.hideMicArea();
      this.ui.hideWaiting();
      this.ui.showWaveform();
      this.ui.showReplayButton();
      
      // Play the dialogue audio
      this.audio.speak(this.currentDialogue, this.language).then(() => {
        this.ui.hideWaveform();
      }).catch(() => {
        this.ui.hideWaveform();
      });
      
      // Start listen timer
      this.timer.start(data.room.timers.listen,
        (left, total) => this.ui.updateTimer(left, total),
        () => {} // Server handles transition
      );
    });

    this.mp.on('player-turn', (data) => {
      this.room = { ...this.room, currentRound: data.round };
      
      const isMyTurn = data.playerId === this.myPlayerId;
      this.isMyTurn = isMyTurn;
      
      const player = this.room.players.find(p => p.id === data.playerId) || { name: data.playerName, avatar: '🎤' };
      this.ui.setCurrentPlayer(player, isMyTurn);
      
      if (data.phase === 'prepare') {
        this.ui.setPhase('prepare', this.language);
        this.ui.hideMicArea();
        
        if (isMyTurn) {
          this.ui.hideWaiting();
          // Countdown animation
          this.anim.showCountdownSequence(data.timeLeft > 3 ? 3 : data.timeLeft);
        } else {
          this.ui.showWaiting(player.name);
        }
        
        this.timer.start(data.timeLeft,
          (left, total) => this.ui.updateTimer(left, total),
          () => {}
        );
      } else if (data.phase === 'speak') {
        this.ui.setPhase('speak', this.language);
        
        if (isMyTurn) {
          this.ui.hideWaiting();
          this.startSpeaking(data.timeLeft);
        } else {
          this.ui.showWaiting(player.name);
          this.ui.hideMicArea();
        }
        
        this.timer.start(data.timeLeft,
          (left, total) => this.ui.updateTimer(left, total),
          () => {
            if (isMyTurn && !this.hasSubmitted) {
              this.stopSpeaking();
            }
          }
        );
      }
    });

    this.mp.on('result-submitted', (data) => {
      this.timer.stop();
      
      const isMe = data.playerId === this.myPlayerId;
      const player = this.room.players.find(p => p.id === data.playerId) || { name: data.playerName, avatar: '🎤' };
      
      // Show result screen briefly
      this.ui.showScreen('result');
      this.ui.showResult(player.name, player.avatar, data.matchPercentage, data.wordComparison, data.spokenText);
      
      // Animate score
      const scoreValue = document.getElementById('score-value');
      const scoreFill = document.getElementById('score-circle-fill');
      
      if (scoreValue) this.anim.animateScore(scoreValue, data.matchPercentage);
      if (scoreFill) this.anim.animateScoreCircle(scoreFill, data.matchPercentage);
      
      this.anim.showScorePopup(data.matchPercentage);
      
      // Update room data
      if (data.room) {
        this.room = data.room;
        this.ui.updateMiniScores(data.room.players);
      }
    });

    this.mp.on('round-finished', (data) => {
      this.timer.stop();
      this.audio.stop();
      this.mic.stopRecording(document.getElementById('mic-indicator'));
      this.speech.stop();
      
      this.room = data.room;
      
      setTimeout(() => {
        this.ui.showScreen('round-results');
        this.ui.renderRoundResults(data.roundResults, data.room.players, data.roundResults.roundNumber);
        this.ui.renderLeaderboard(data.leaderboard, 'leaderboard-mini');
        
        const nextBtn = document.getElementById('btn-next-round');
        if (data.room.host === this.myPlayerId) {
          nextBtn.classList.remove('hidden');
          nextBtn.textContent = data.isLastRound ? this.ui.t('gameOver') : this.ui.t('nextRound');
        } else {
          nextBtn.classList.add('hidden');
        }
      }, 3500);
    });

    this.mp.on('game-finished', (data) => {
      this.timer.stop();
      this.audio.stop();
      this.mic.release();
      
      this.room = data.room;
      
      setTimeout(() => {
        this.ui.showScreen('gameover');
        this.ui.renderGameOver(data.winner, data.leaderboard);
        
        const confettiContainer = document.getElementById('confetti-container');
        this.anim.showConfetti(confettiContainer);
      }, 1000);
    });

    this.mp.on('error-message', (data) => {
      this.ui.notify(data.message, 'error');
    });

    this.mp.on('custom-dialogue-added', (data) => {
      this.ui.notify(`${data.addedBy} added a custom dialogue!`, 'info');
    });

    this.mp.on('disconnected', () => {
      this.ui.notify(this.ui.t('disconnected'), 'warning');
    });
  }

  async createRoom() {
    const name = document.getElementById('player-name').value.trim();
    if (!name) {
      this.ui.notify('Please enter your name', 'warning');
      return;
    }

    const settings = {
      language: this.language,
      gameMode: document.getElementById('setting-mode').value,
      totalRounds: parseInt(document.getElementById('setting-rounds').value),
      maxPlayers: parseInt(document.getElementById('setting-max-players').value),
      speakTime: parseInt(document.getElementById('setting-speak-time').value)
    };

    try {
      const response = await this.mp.createRoom(name, this.ui.getSelectedAvatar(), settings);
      this.room = response.room;
      this.myPlayerId = response.playerId;
      this.ui.showScreen('lobby');
      this.setupLobby(response.room);
      this.ui.notify(`Room ${response.roomCode} created!`, 'success');
    } catch (err) {
      this.ui.notify(err.message, 'error');
    }
  }

  async joinRoom() {
    const name = document.getElementById('player-name').value.trim();
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    
    if (!name) {
      this.ui.notify('Please enter your name', 'warning');
      return;
    }
    if (!code || code.length < 4) {
      this.ui.notify('Please enter a valid room code', 'warning');
      return;
    }

    try {
      const response = await this.mp.joinRoom(code, name, this.ui.getSelectedAvatar());
      this.room = response.room;
      this.myPlayerId = response.playerId;
      this.language = response.room.language;
      this.ui.setLanguage(this.language);
      this.ui.showScreen('lobby');
      this.setupLobby(response.room);
      this.ui.notify('Joined room!', 'success');
    } catch (err) {
      this.ui.notify(err.message || this.ui.t('errorJoin'), 'error');
    }
  }

  setupLobby(room) {
    document.getElementById('display-room-code').textContent = room.id;
    this.ui.renderLobbyPlayers(room.players, this.myPlayerId);
    this.ui.renderLobbyInfo(room);
    
    const startBtn = document.getElementById('btn-start-game');
    if (room.host === this.myPlayerId) {
      startBtn.classList.remove('hidden');
    } else {
      startBtn.classList.add('hidden');
    }
    
    // Show custom dialogue panel if custom mode
    const customPanel = document.getElementById('custom-dialogue-panel');
    if (room.gameMode === 'custom') {
      customPanel.classList.remove('hidden');
    } else {
      customPanel.classList.add('hidden');
    }
  }

  async startSpeaking(timeLimit) {
    this.hasSubmitted = false;
    this.ui.showMicArea();
    this.ui.updateSpokenText('');
    
    // Request mic access
    const hasAccess = await this.mic.requestAccess();
    if (!hasAccess) {
      this.ui.notify(this.ui.t('micPermission'), 'error');
      // Fall back to timed out
      setTimeout(() => {
        if (!this.hasSubmitted) {
          this.submitEmptyResult();
        }
      }, timeLimit * 1000);
      return;
    }
    
    const micIndicator = document.getElementById('mic-indicator');
    this.mic.startRecording(micIndicator);
    
    this.speech.setLanguage(this.language);
    
    this.speech.start(
      // Interim callback
      (text) => {
        this.ui.updateSpokenText(text);
      },
      // Final callback
      (finalText) => {
        if (!this.hasSubmitted) {
          this.submitSpeechResult(finalText);
        }
      }
    );

    this.ui.notify(this.ui.t('micRecording'), 'info');
  }

  stopSpeaking() {
    const micIndicator = document.getElementById('mic-indicator');
    this.mic.stopRecording(micIndicator);
    this.speech.stop();
    // The speech.onend handler will call submitSpeechResult
  }

  submitSpeechResult(spokenText) {
    if (this.hasSubmitted) return;
    this.hasSubmitted = true;
    
    const micIndicator = document.getElementById('mic-indicator');
    this.mic.stopRecording(micIndicator);
    this.mic.release();
    
    const comparison = SpeechComparison.compare(this.currentDialogue, spokenText);
    
    this.mp.submitResult({
      matchPercentage: comparison.matchPercentage,
      spokenText: spokenText,
      wordComparison: comparison.wordComparison
    });
    
    this.ui.hideMicArea();
  }

  submitEmptyResult() {
    if (this.hasSubmitted) return;
    this.hasSubmitted = true;
    
    this.mp.submitResult({
      matchPercentage: 0,
      spokenText: '',
      wordComparison: []
    });
    
    this.ui.hideMicArea();
  }
}
