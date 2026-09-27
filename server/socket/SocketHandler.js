class SocketHandler {
  constructor(io, gameManager) {
    this.io = io;
    this.gm = gameManager;
    this.turnTimers = new Map();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      socket.on('create-room', (data, callback) => this.handleCreateRoom(socket, data, callback));
      socket.on('join-room', (data, callback) => this.handleJoinRoom(socket, data, callback));
      socket.on('player-ready', (data) => this.handlePlayerReady(socket, data));
      socket.on('start-game', () => this.handleStartGame(socket));
      socket.on('request-next-round', (data) => this.handleNextRound(socket, data));
      socket.on('player-listened', () => this.handlePlayerListened(socket));
      socket.on('player-prepared', () => this.handlePlayerPrepared(socket));
      socket.on('submit-result', (data) => this.handleSubmitResult(socket, data));
      socket.on('turn-timeout', () => this.handleTurnTimeout(socket));
      socket.on('add-custom-dialogue', (data, callback) => this.handleCustomDialogue(socket, data, callback));
      socket.on('reconnect-attempt', (data, callback) => this.handleReconnect(socket, data, callback));
      socket.on('chat-message', (data) => this.handleChatMessage(socket, data));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  handleCreateRoom(socket, data, callback) {
    try {
      const { playerName, avatar, settings } = data;
      const { room, player } = this.gm.createRoom(socket.id, playerName, avatar, settings);
      
      socket.join(room.id);
      
      callback({
        success: true,
        roomCode: room.id,
        playerId: player.id,
        room: room.toJSON()
      });
      
      console.log(`🏠 Room ${room.id} created by ${playerName}`);
    } catch (err) {
      console.error('Create room error:', err);
      callback({ success: false, error: 'Failed to create room' });
    }
  }

  handleJoinRoom(socket, data, callback) {
    try {
      const { roomCode, playerName, avatar } = data;
      const result = this.gm.joinRoom(socket.id, roomCode, playerName, avatar);
      
      if (!result.success) {
        callback(result);
        return;
      }
      
      socket.join(result.room.id);
      
      callback({
        success: true,
        roomCode: result.room.id,
        playerId: result.player.id,
        room: result.room.toJSON()
      });
      
      socket.to(result.room.id).emit('player-joined', {
        player: result.player.toJSON(),
        room: result.room.toJSON()
      });
      
      console.log(`👤 ${playerName} joined room ${result.room.id}`);
    } catch (err) {
      console.error('Join room error:', err);
      callback({ success: false, error: 'Failed to join room' });
    }
  }

  handlePlayerReady(socket, data) {
    const room = this.gm.getRoomBySocket(socket.id);
    const player = this.gm.getPlayerBySocket(socket.id);
    if (!room || !player) return;
    
    player.isReady = data.ready;
    
    this.io.to(room.id).emit('player-updated', {
      player: player.toJSON(),
      room: room.toJSON(),
      allReady: room.allPlayersReady()
    });
  }

  handleStartGame(socket) {
    const room = this.gm.getRoomBySocket(socket.id);
    const player = this.gm.getPlayerBySocket(socket.id);
    if (!room || !player) return;
    
    if (player.id !== room.host) {
      socket.emit('error-message', { message: 'Only the host can start the game' });
      return;
    }
    
    const result = room.startGame();
    if (!result.success) {
      socket.emit('error-message', { message: result.error });
      return;
    }
    
    this.io.to(room.id).emit('game-started', { room: room.toJSON() });
    
    // Instead of auto-starting, ask host to pick the first dialogue
    setTimeout(() => {
      this.io.to(room.id).emit('waiting-for-dialogue', {
        host: room.host,
        roundNumber: 1,
        totalRounds: room.totalRounds,
        room: room.toJSON()
      });
    }, 1500);
  }

  handleNextRound(socket, data) {
    const room = this.gm.getRoomBySocket(socket.id);
    const player = this.gm.getPlayerBySocket(socket.id);
    if (!room || !player) return;
    
    // Only host can start next round
    if (player.id !== room.host) {
      socket.emit('error-message', { message: 'Only the host can start the next round' });
      return;
    }
    
    const customText = data && data.customDialogue ? data.customDialogue : null;
    this.startNextRound(room, customText);
  }

  startNextRound(room, customDialogueText = null) {
    const round = room.startNextRound(customDialogueText);
    
    if (!round) {
      // Game finished
      room.status = 'finished';
      this.io.to(room.id).emit('game-finished', {
        leaderboard: room.getLeaderboard(),
        winner: room.getWinner(),
        room: room.toJSON()
      });
      return;
    }
    
    this.io.to(room.id).emit('round-started', {
      round: round.toJSON(),
      room: room.toJSON()
    });
    
    // After listen time, transition to first player's turn
    setTimeout(() => {
      this.startPlayerTurn(room);
    }, room.timers.listen * 1000);
  }

  startPlayerTurn(room) {
    if (!room.currentRound) return;
    
    const currentPlayerId = room.currentRound.getCurrentPlayerId();
    if (!currentPlayerId) {
      this.finishRound(room);
      return;
    }
    
    const player = room.getPlayer(currentPlayerId);
    if (!player || !player.isConnected) {
      // Skip disconnected player
      room.skipPlayer(currentPlayerId);
      const nextId = room.currentRound.getCurrentPlayerId();
      if (!nextId) {
        this.finishRound(room);
      } else {
        this.startPlayerTurn(room);
      }
      return;
    }
    
    room.currentRound.status = 'preparing';
    
    this.io.to(room.id).emit('player-turn', {
      playerId: currentPlayerId,
      playerName: player.name,
      phase: 'prepare',
      timeLeft: room.timers.prepare,
      round: room.currentRound.toJSON()
    });
    
    // After prepare time, start speaking phase
    const prepTimer = setTimeout(() => {
      room.currentRound.status = 'speaking';
      
      this.io.to(room.id).emit('player-turn', {
        playerId: currentPlayerId,
        playerName: player.name,
        phase: 'speak',
        timeLeft: room.timers.speak,
        round: room.currentRound.toJSON()
      });
      
      // Auto-skip after speak time
      const speakTimer = setTimeout(() => {
        if (room.currentRound && room.currentRound.getCurrentPlayerId() === currentPlayerId) {
          this.handleTurnTimeoutForPlayer(room, currentPlayerId);
        }
      }, room.timers.speak * 1000);
      
      this.turnTimers.set(`${room.id}-${currentPlayerId}-speak`, speakTimer);
    }, room.timers.prepare * 1000);
    
    this.turnTimers.set(`${room.id}-${currentPlayerId}-prep`, prepTimer);
  }

  handleSubmitResult(socket, data) {
    const room = this.gm.getRoomBySocket(socket.id);
    const player = this.gm.getPlayerBySocket(socket.id);
    if (!room || !player || !room.currentRound) return;
    
    if (room.currentRound.getCurrentPlayerId() !== player.id) return;
    
    // Clear timers
    this.clearPlayerTimers(room.id, player.id);
    
    room.submitPlayerResult(player.id, data);
    
    this.io.to(room.id).emit('result-submitted', {
      playerId: player.id,
      playerName: player.name,
      matchPercentage: data.matchPercentage,
      wordComparison: data.wordComparison,
      spokenText: data.spokenText,
      round: room.currentRound.toJSON(),
      room: room.toJSON()
    });
    
    // Move to next player after showing result
    setTimeout(() => {
      if (room.currentRound && room.currentRound.isComplete()) {
        this.finishRound(room);
      } else {
        this.startPlayerTurn(room);
      }
    }, 3000);
  }

  handleTurnTimeout(socket) {
    const room = this.gm.getRoomBySocket(socket.id);
    const player = this.gm.getPlayerBySocket(socket.id);
    if (!room || !player || !room.currentRound) return;
    
    if (room.currentRound.getCurrentPlayerId() !== player.id) return;
    
    this.handleTurnTimeoutForPlayer(room, player.id);
  }

  handleTurnTimeoutForPlayer(room, playerId) {
    this.clearPlayerTimers(room.id, playerId);
    
    room.skipPlayer(playerId);
    const player = room.getPlayer(playerId);
    
    this.io.to(room.id).emit('result-submitted', {
      playerId: playerId,
      playerName: player ? player.name : 'Unknown',
      matchPercentage: 0,
      wordComparison: [],
      spokenText: '(timed out)',
      round: room.currentRound ? room.currentRound.toJSON() : null,
      room: room.toJSON()
    });
    
    setTimeout(() => {
      if (room.currentRound && room.currentRound.isComplete()) {
        this.finishRound(room);
      } else {
        this.startPlayerTurn(room);
      }
    }, 2000);
  }

  clearPlayerTimers(roomId, playerId) {
    const prepKey = `${roomId}-${playerId}-prep`;
    const speakKey = `${roomId}-${playerId}-speak`;
    if (this.turnTimers.has(prepKey)) {
      clearTimeout(this.turnTimers.get(prepKey));
      this.turnTimers.delete(prepKey);
    }
    if (this.turnTimers.has(speakKey)) {
      clearTimeout(this.turnTimers.get(speakKey));
      this.turnTimers.delete(speakKey);
    }
  }

  finishRound(room) {
    if (!room.currentRound) return;
    
    room.currentRound.status = 'complete';
    
    const isLastRound = room.isLastRound();
    
    this.io.to(room.id).emit('round-finished', {
      roundResults: room.currentRound.getResults(),
      leaderboard: room.getLeaderboard(),
      room: room.toJSON(),
      isLastRound: isLastRound,
      nextRoundNumber: room.roundNumber + 1
    });
  }

  handleCustomDialogue(socket, data, callback) {
    const room = this.gm.getRoomBySocket(socket.id);
    const player = this.gm.getPlayerBySocket(socket.id);
    if (!room || !player) {
      callback({ success: false, error: 'Not in a room' });
      return;
    }
    
    const dialogue = room.dialogueManager.addCustomDialogue(data.text, room.language, player.name);
    callback({ success: true, dialogue });
    
    this.io.to(room.id).emit('custom-dialogue-added', {
      dialogue,
      addedBy: player.name
    });
  }

  handleReconnect(socket, data, callback) {
    const { playerId, roomCode } = data;
    const result = this.gm.handleReconnect(socket.id, playerId, roomCode);
    
    if (!result) {
      callback({ success: false, error: 'Could not reconnect' });
      return;
    }
    
    socket.join(result.room.id);
    
    callback({
      success: true,
      room: result.room.toJSON(),
      playerId: result.player.id
    });
    
    socket.to(result.room.id).emit('player-reconnected', {
      player: result.player.toJSON(),
      room: result.room.toJSON()
    });
  }

  handleChatMessage(socket, data) {
    const room = this.gm.getRoomBySocket(socket.id);
    const player = this.gm.getPlayerBySocket(socket.id);
    if (!room || !player) return;
    
    this.io.to(room.id).emit('chat-message', {
      playerName: player.name,
      avatar: player.avatar,
      message: data.message,
      timestamp: Date.now()
    });
  }

  handleDisconnect(socket) {
    const result = this.gm.handleDisconnect(socket.id);
    if (!result) return;
    
    const { room, player } = result;
    
    this.io.to(room.id).emit('player-disconnected', {
      player: player.toJSON(),
      room: room.toJSON()
    });
    
    // If it's this player's turn, skip them
    if (room.currentRound && room.currentRound.getCurrentPlayerId() === player.id) {
      setTimeout(() => {
        this.handleTurnTimeoutForPlayer(room, player.id);
      }, 1000);
    }
    
    console.log(`🔌 ${player.name} disconnected from room ${room.id}`);
  }

  handlePlayerListened(socket) {
    // Just acknowledge
  }

  handlePlayerPrepared(socket) {
    // Just acknowledge
  }
}

module.exports = SocketHandler;
