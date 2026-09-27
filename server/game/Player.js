const { v4: uuidv4 } = require('uuid');

class Player {
  constructor(socketId, name, avatar) {
    this.id = uuidv4();
    this.socketId = socketId;
    this.name = name || `Player_${Math.floor(Math.random() * 1000)}`;
    this.avatar = avatar || this.getRandomAvatar();
    this.isReady = false;
    this.isConnected = true;
    this.isHost = false;
    
    this.scores = {
      roundScores: [],
      totalScore: 0,
      averageMatch: 0,
      bestPerformance: 0,
      perfectMatches: 0,
      currentRoundScore: 0
    };
    
    this.currentTurnData = null;
    this.disconnectedAt = null;
  }

  getRandomAvatar() {
    const avatars = ['🎤','🎵','🎶','🎸','🎹','🥁','🎺','🎻','🎼','🎧',
                     '🦊','🐱','🐶','🐸','🦁','🐼','🐨','🐯','🦄','🐲'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }

  addRoundScore(matchPercentage) {
    this.scores.roundScores.push(matchPercentage);
    this.scores.currentRoundScore = matchPercentage;
    this.scores.totalScore = this.scores.roundScores.reduce((a, b) => a + b, 0);
    this.scores.averageMatch = Math.round(this.scores.totalScore / this.scores.roundScores.length);
    if (matchPercentage > this.scores.bestPerformance) {
      this.scores.bestPerformance = matchPercentage;
    }
    if (matchPercentage === 100) {
      this.scores.perfectMatches++;
    }
  }

  resetScores() {
    this.scores = {
      roundScores: [],
      totalScore: 0,
      averageMatch: 0,
      bestPerformance: 0,
      perfectMatches: 0,
      currentRoundScore: 0
    };
  }

  disconnect() {
    this.isConnected = false;
    this.disconnectedAt = Date.now();
  }

  reconnect(newSocketId) {
    this.socketId = newSocketId;
    this.isConnected = true;
    this.disconnectedAt = null;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      isReady: this.isReady,
      isConnected: this.isConnected,
      isHost: this.isHost,
      scores: { ...this.scores }
    };
  }
}

module.exports = Player;
