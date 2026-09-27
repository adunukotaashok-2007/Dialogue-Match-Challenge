export class MultiplayerClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomCode = null;
    this.playerId = null;
    this.listeners = {};
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = io({
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      this.socket.on('connect', () => {
        this.connected = true;
        console.log('✅ Connected to server');
        
        // Try to reconnect to room
        if (this.roomCode && this.playerId) {
          this.socket.emit('reconnect-attempt', {
            playerId: this.playerId,
            roomCode: this.roomCode
          }, (response) => {
            if (response.success) {
              console.log('✅ Reconnected to room');
              this.emit('reconnected', response);
            }
          });
        }
        
        resolve();
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        this.emit('disconnected');
      });

      this.socket.on('connect_error', (err) => {
        console.error('Connection error:', err);
      });

      // Forward all game events
      const events = [
        'player-joined', 'player-updated', 'player-disconnected', 'player-reconnected',
        'game-started', 'round-started', 'player-turn', 'result-submitted',
        'round-finished', 'game-finished', 'custom-dialogue-added',
        'error-message', 'chat-message'
      ];

      events.forEach(event => {
        this.socket.on(event, (data) => {
          this.emit(event, data);
        });
      });

      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  createRoom(playerName, avatar, settings) {
    return new Promise((resolve, reject) => {
      this.socket.emit('create-room', { playerName, avatar, settings }, (response) => {
        if (response.success) {
          this.roomCode = response.roomCode;
          this.playerId = response.playerId;
          this.saveSession();
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  joinRoom(roomCode, playerName, avatar) {
    return new Promise((resolve, reject) => {
      this.socket.emit('join-room', { roomCode, playerName, avatar }, (response) => {
        if (response.success) {
          this.roomCode = response.roomCode;
          this.playerId = response.playerId;
          this.saveSession();
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  setReady(ready) {
    this.socket.emit('player-ready', { ready });
  }

  startGame() {
    this.socket.emit('start-game');
  }

  requestNextRound() {
    this.socket.emit('request-next-round');
  }

  submitResult(data) {
    this.socket.emit('submit-result', data);
  }

  turnTimeout() {
    this.socket.emit('turn-timeout');
  }

  addCustomDialogue(text) {
    return new Promise((resolve, reject) => {
      this.socket.emit('add-custom-dialogue', { text }, (response) => {
        if (response.success) resolve(response);
        else reject(new Error(response.error));
      });
    });
  }

  sendChat(message) {
    this.socket.emit('chat-message', { message });
  }

  // Event system
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  saveSession() {
    try {
      sessionStorage.setItem('dmc_room', this.roomCode);
      sessionStorage.setItem('dmc_player', this.playerId);
    } catch (e) {}
  }

  loadSession() {
    try {
      this.roomCode = sessionStorage.getItem('dmc_room');
      this.playerId = sessionStorage.getItem('dmc_player');
    } catch (e) {}
  }

  clearSession() {
    this.roomCode = null;
    this.playerId = null;
    try {
      sessionStorage.removeItem('dmc_room');
      sessionStorage.removeItem('dmc_player');
    } catch (e) {}
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.clearSession();
  }
}
