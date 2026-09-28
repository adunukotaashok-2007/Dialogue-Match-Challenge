/**
 * MultiplayerClient
 * =================
 * Manages Socket.IO connection, room sessions,
 * reconnection, game events, and player actions.
 */

export class MultiplayerClient {
  constructor() {
    this.socket = null;
    this.connected = false;

    this.roomCode = null;
    this.playerId = null;

    this.listeners = {};
    this.connectionPromise = null;
  }

  /**
   * Connect to the Socket.IO server.
   */
  connect() {
    // Already connected
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    // Connection already in progress
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      let settled = false;

      this.socket = io({
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.connectionPromise = null;
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      /**
       * Connected
       */
      this.socket.on('connect', () => {
        this.connected = true;

        console.log('✅ Connected to server:', this.socket.id);

        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          this.connectionPromise = null;
          resolve();
        }

        this.emit('connected', {
          socketId: this.socket.id
        });

        // Attempt room reconnection if previous session exists.
        this.attemptRoomReconnect();
      });

      /**
       * Disconnected
       */
      this.socket.on('disconnect', (reason) => {
        this.connected = false;

        console.log('🔌 Disconnected from server:', reason);

        this.emit('disconnected', {
          reason
        });
      });

      /**
       * Connection error
       */
      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);

        this.emit('connection-error', {
          message: error?.message || 'Connection error',
          error
        });

        if (!settled) {
          // Do not immediately reject every temporary
          // Socket.IO reconnection error.
          console.warn('Waiting for Socket.IO to reconnect...');
        }
      });

      /**
       * General Socket.IO error.
       */
      this.socket.on('error', (error) => {
        console.error('❌ Socket error:', error);

        this.emit('socket-error', error);
      });

      /**
       * Server-side game events.
       */
      const events = [
        'player-joined',
        'player-updated',
        'player-disconnected',
        'player-reconnected',

        'room-updated',

        'game-started',
        'round-started',
        'player-turn',

        'dialogue-ready',
        'dialogue-updated',
        'custom-dialogue-added',

        'result-submitted',
        'round-finished',
        'game-finished',

        'turn-timeout',

        'chat-message',

        'error-message'
      ];

      events.forEach((event) => {
        this.socket.on(event, (data) => {
          this.emit(event, data);
        });
      });
    });

    return this.connectionPromise;
  }

  /**
   * Reconnect the current player to an existing room.
   */
  attemptRoomReconnect() {
    if (!this.socket?.connected) return;

    if (!this.roomCode || !this.playerId) {
      return;
    }

    console.log('🔄 Attempting room reconnection...');

    this.socket.emit(
      'reconnect-attempt',
      {
        playerId: this.playerId,
        roomCode: this.roomCode
      },
      (response) => {
        if (!response) {
          return;
        }

        if (response.success) {
          console.log('✅ Reconnected to room:', this.roomCode);

          this.emit('reconnected', response);
        } else {
          console.warn(
            '⚠️ Room reconnection failed:',
            response.error
          );

          this.emit('reconnect-failed', response);

          // Session is no longer valid.
          if (
            response.error === 'ROOM_NOT_FOUND' ||
            response.error === 'PLAYER_NOT_FOUND'
          ) {
            this.clearSession();
          }
        }
      }
    );
  }

  /**
   * Create a new game room.
   *
   * @param {string} playerName
   * @param {string} avatar
   * @param {object} settings
   */
  createRoom(playerName, avatar, settings = {}) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit(
        'create-room',
        {
          playerName,
          avatar,
          settings
        },
        (response) => {
          if (!response) {
            reject(new Error('No response from server'));
            return;
          }

          if (response.success) {
            this.roomCode = response.roomCode;
            this.playerId = response.playerId;

            this.saveSession();

            resolve(response);
          } else {
            reject(
              new Error(response.error || 'Unable to create room')
            );
          }
        }
      );
    });
  }

  /**
   * Join an existing room.
   *
   * @param {string} roomCode
   * @param {string} playerName
   * @param {string} avatar
   */
  joinRoom(roomCode, playerName, avatar) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      const normalizedRoomCode = String(roomCode || '')
        .trim()
        .toUpperCase();

      if (!normalizedRoomCode) {
        reject(new Error('Room code is required'));
        return;
      }

      this.socket.emit(
        'join-room',
        {
          roomCode: normalizedRoomCode,
          playerName,
          avatar
        },
        (response) => {
          if (!response) {
            reject(new Error('No response from server'));
            return;
          }

          if (response.success) {
            this.roomCode = response.roomCode;
            this.playerId = response.playerId;

            this.saveSession();

            resolve(response);
          } else {
            reject(
              new Error(response.error || 'Unable to join room')
            );
          }
        }
      );
    });
  }

  /**
   * Set player ready state.
   */
  setReady(ready) {
    this.emitToServer('player-ready', {
      ready: Boolean(ready)
    });
  }

  /**
   * Start the game.
   * Usually only the host should be allowed by the server.
   */
  startGame() {
    this.emitToServer('start-game');
  }

  /**
   * Request the next round.
   */
  requestNextRound() {
    this.emitToServer('request-next-round');
  }

  /**
   * Submit speech/dialogue comparison result.
   */
  submitResult(data) {
    this.emitToServer('submit-result', data);
  }

  /**
   * Tell the server that the player's turn timed out.
   */
  turnTimeout() {
    this.emitToServer('turn-timeout');
  }

  /**
   * Add a custom dialogue.
   */
  addCustomDialogue(text) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      const dialogue = String(text || '').trim();

      if (!dialogue) {
        reject(new Error('Dialogue cannot be empty'));
        return;
      }

      this.socket.emit(
        'add-custom-dialogue',
        {
          text: dialogue
        },
        (response) => {
          if (!response) {
            reject(new Error('No response from server'));
            return;
          }

          if (response.success) {
            resolve(response);
          } else {
            reject(
              new Error(
                response.error || 'Unable to add dialogue'
              )
            );
          }
        }
      );
    });
  }

  /**
   * Send chat message.
   */
  sendChat(message) {
    const text = String(message || '').trim();

    if (!text) return;

    this.emitToServer('chat-message', {
      message: text
    });
  }

  /**
   * Generic server emit helper.
   */
  emitToServer(event, data) {
    if (!this.socket?.connected) {
      console.warn(
        `Cannot emit "${event}": socket is not connected`
      );
      return false;
    }

    if (data === undefined) {
      this.socket.emit(event);
    } else {
      this.socket.emit(event, data);
    }

    return true;
  }

  /**
   * Register an event listener.
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      return;
    }

    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);
  }

  /**
   * Remove an event listener.
   */
  off(event, callback) {
    if (!this.listeners[event]) {
      return;
    }

    if (!callback) {
      delete this.listeners[event];
      return;
    }

    this.listeners[event] =
      this.listeners[event].filter(
        (cb) => cb !== callback
      );

    if (this.listeners[event].length === 0) {
      delete this.listeners[event];
    }
  }

  /**
   * Internal event emitter.
   *
   * This is separate from socket.emit() so that
   * application-level listeners don't accidentally
   * send events back to the server.
   */
  emit(event, data) {
    const callbacks = this.listeners[event];

    if (!callbacks || callbacks.length === 0) {
      return;
    }

    callbacks.slice().forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(
          `Error in "${event}" listener:`,
          error
        );
      }
    });
  }

  /**
   * Save room/player session.
   */
  saveSession() {
    try {
      if (this.roomCode) {
        sessionStorage.setItem(
          'dmc_room',
          this.roomCode
        );
      }

      if (this.playerId) {
        sessionStorage.setItem(
          'dmc_player',
          this.playerId
        );
      }
    } catch (error) {
      console.warn(
        'Unable to save multiplayer session:',
        error
      );
    }
  }

  /**
   * Load previous room/player session.
   */
  loadSession() {
    try {
      this.roomCode =
        sessionStorage.getItem('dmc_room');

      this.playerId =
        sessionStorage.getItem('dmc_player');

      return {
        roomCode: this.roomCode,
        playerId: this.playerId
      };
    } catch (error) {
      console.warn(
        'Unable to load multiplayer session:',
        error
      );

      return {
        roomCode: null,
        playerId: null
      };
    }
  }

  /**
   * Check whether a previous session exists.
   */
  hasSession() {
    return Boolean(
      this.roomCode &&
      this.playerId
    );
  }

  /**
   * Clear saved session.
   */
  clearSession() {
    this.roomCode = null;
    this.playerId = null;

    try {
      sessionStorage.removeItem('dmc_room');
      sessionStorage.removeItem('dmc_player');
    } catch (error) {
      console.warn(
        'Unable to clear multiplayer session:',
        error
      );
    }
  }

  /**
   * Disconnect from Socket.IO.
   */
  disconnect(clearSession = true) {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connected = false;
    this.connectionPromise = null;

    if (clearSession) {
      this.clearSession();
    }

    this.emit('disconnected');
  }

  /**
   * Returns current connection state.
   */
  isConnected() {
    return Boolean(
      this.connected &&
      this.socket?.connected
    );
  }

  /**
   * Get current room/player information.
   */
  getSession() {
    return {
      roomCode: this.roomCode,
      playerId: this.playerId,
      connected: this.isConnected()
    };
  }
}
