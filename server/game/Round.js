class Round {
  constructor(number, dialogue, players) {
    this.number = number;
    this.dialogue = dialogue;
    this.players = players.map(p => p.id);
    this.playerResults = {};
    this.currentPlayerIndex = 0;
    this.status = 'waiting'; // waiting, listening, preparing, speaking, scoring, complete
    this.startedAt = null;
    this.completedAt = null;
  }

  getCurrentPlayerId() {
    if (this.currentPlayerIndex < this.players.length) {
      return this.players[this.currentPlayerIndex];
    }
    return null;
  }

  submitResult(playerId, matchData) {
    this.playerResults[playerId] = {
      matchPercentage: matchData.matchPercentage,
      spokenText: matchData.spokenText,
      wordComparison: matchData.wordComparison,
      submittedAt: Date.now()
    };
  }

  nextPlayer() {
    this.currentPlayerIndex++;
    if (this.currentPlayerIndex >= this.players.length) {
      this.status = 'complete';
      this.completedAt = Date.now();
      return null;
    }
    return this.players[this.currentPlayerIndex];
  }

  isComplete() {
    return this.status === 'complete' || this.currentPlayerIndex >= this.players.length;
  }

  getResults() {
    return {
      roundNumber: this.number,
      dialogue: this.dialogue,
      results: this.playerResults
    };
  }

  toJSON() {
    return {
      number: this.number,
      dialogue: this.dialogue,
      currentPlayerIndex: this.currentPlayerIndex,
      currentPlayerId: this.getCurrentPlayerId(),
      status: this.status,
      playerResults: this.playerResults,
      totalPlayers: this.players.length
    };
  }
}

module.exports = Round;
