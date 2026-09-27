require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const SocketHandler = require('./socket/SocketHandler');
const GameManager = require('./game/GameManager');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const gameManager = new GameManager();
const socketHandler = new SocketHandler(io, gameManager);
socketHandler.initialize();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: gameManager.getRoomCount(), players: gameManager.getPlayerCount() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 Dialogue Match Challenge server running on port ${PORT}`);
  console.log(`   Open http://localhost:${PORT} in your browser`);
});
