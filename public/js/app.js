import { GameClient } from './modules/GameClient.js';

// Initialize the game
const game = new GameClient();

window.addEventListener('DOMContentLoaded', async () => {
  await game.init();
  console.log('🎮 Dialogue Match Challenge loaded!');
});

// Prevent speech synthesis from getting stuck
window.addEventListener('beforeunload', () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
});
