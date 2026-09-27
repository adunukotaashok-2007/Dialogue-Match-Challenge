const { v4: uuidv4 } = require('uuid');
const Round = require('./Round');
const DialogueManager = require('./DialogueManager');

class Room {
  constructor(hostPlayer, settings = {}) {
    this.id = this.generateRoomCode();
    this.host = hostPlayer.id;
    this.players = [hostPlayer];
    this.maxPlayers = settings.maxPlayers || 10;
    this.status = 'lobby'; // lobby, playing, paused, finished
    this.language = settings.language || 'en';
    this.gameMode = settings.gameMode || 'classic';
    this.totalRounds = settings.totalRounds || 5;
    this.currentRound = null;
    this.roundNumber = 0;
    this.rounds = [];
    this.createdAt = Date.now();
    this.dialogueManager = new DialogueManager();
    
    this.timers = {
      listen: settings.listenTime || 10,
      prepare: settings.prepareTime || 5,
      speak: settings.speakTime || 15
    };
    
    if (this.gameMode === 'speed') {
      this.timers = { listen: 5, prepare: 2, speak: 10 };
    }

    hostPlayer.isHost = true;
    
    this.disconnectTimers = {};
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  addPlayer(player) {
    if (this.players.length >= this.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }
    if (this.status !== 'lobby') {
      return { success: false, error: 'Game already in progress' };
    }
    
    const existing = this.players.find(p => p.name === player.name);
    if (existing && existing.isConnected) {
      return { success: false, error: 'Name already taken' };
    }
    
    this.players.push(player);
    return { success: true };
  }

  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    if (this.players.length > 0 && this.host === playerId) {
      this.players[0].isHost = true;
      this.host = this.players[0].id;
    }
    return this.players.length;
  }

  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  getPlayerBySocket(socketId) {
    return this.players.find(p => p.socketId === socketId);
  }

  allPlayersReady() {
    return this.players.length >= 2 && this.players.every(p => p.isReady || p.isHost);
  }

  getConnectedPlayers() {
    return this.players.filter(p => p.isConnected);
  }

  startGame() {
    if (this.players.length < 2) {
      return { success: false, error: 'Need at least 2 players' };
    }
    this.status = 'playing';
    this.roundNumber = 0;
    this.rounds = [];
    this.players.forEach(p => p.resetScores());
    return { success: true };
  }

  startNextRound() {
    this.roundNumber++;
    if (this.gameMode !== 'endless' && this.roundNumber > this.totalRounds) {
      this.status = 'finished';
      return null;
    }
    
    const dialogue = this.dialogueManager.getRandomDialogue(this.language);
    const connectedPlayers = this.getConnectedPlayers();
    this.currentRound = new Round(this.roundNumber, dialogue, connectedPlayers);
    this.currentRound.status = 'listening';
    this.currentRound.startedAt = Date.now();
    this.rounds.push(this.currentRound);
    
    return this.currentRound;
  }

  submitPlayerResult(playerId, matchData) {
    if (!this.currentRound) return null;
    
    this.currentRound.submitResult(playerId, matchData);
    const player = this.getPlayer(playerId);
    if (player) {
      player.addRoundScore(matchData.matchPercentage);
    }
    
    return this.currentRound.nextPlayer();
  }

  skipPlayer(playerId) {
    if (!this.currentRound) return null;
    
    this.currentRound.submitResult(playerId, {
      matchPercentage: 0,
      spokenText: '',
      wordComparison: [],
    });
    const player = this.getPlayer(playerId);
    if (player) {
      player.addRoundScore(0);
    }
    
    return this.currentRound.nextPlayer();
  }

  getLeaderboard() {
    return this.players
      .map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        ...p.scores,
        isConnected: p.isConnected
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  getWinner() {
    const leaderboard = this.getLeaderboard();
    return leaderboard.length > 0 ? leaderboard[0] : null;
  }

  toJSON() {
    return {
      id: this.id,
      host: this.host,
      players: this.players.map(p => p.toJSON()),
      maxPlayers: this.maxPlayers,
      status: this.status,
      language: this.language,
      gameMode: this.gameMode,
      totalRounds: this.totalRounds,
      roundNumber: this.roundNumber,
      currentRound: this.currentRound ? this.currentRound.toJSON() : null,
      timers: this.timers,
      leaderboard: this.getLeaderboard()
    };
  }
}

module.exports = Room;
