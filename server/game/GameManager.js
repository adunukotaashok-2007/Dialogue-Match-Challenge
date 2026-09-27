const Room = require('./Room');
const Player = require('./Player');

class GameManager {
  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
    this.socketToPlayer = new Map();
    this.playerIdToSocket = new Map();
    
    // Cleanup stale rooms every 5 min
    setInterval(() => this.cleanupStaleRooms(), 5 * 60 * 1000);
  }

  createRoom(socketId, playerName, avatar, settings = {}) {
    const player = new Player(socketId, playerName, avatar);
    const room = new Room(player, settings);
    
    this.rooms.set(room.id, room);
    this.socketToRoom.set(socketId, room.id);
    this.socketToPlayer.set(socketId, player);
    this.playerIdToSocket.set(player.id, socketId);
    
    return { room, player };
  }

  joinRoom(socketId, roomCode, playerName, avatar) {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    
    const player = new Player(socketId, playerName, avatar);
    const result = room.addPlayer(player);
    
    if (!result.success) {
      return result;
    }
    
    this.socketToRoom.set(socketId, room.id);
    this.socketToPlayer.set(socketId, player);
    this.playerIdToSocket.set(player.id, socketId);
    
    return { success: true, room, player };
  }

  handleDisconnect(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    const player = this.socketToPlayer.get(socketId);
    
    if (!roomId || !player) return null;
    
    const room = this.rooms.get(roomId);
    if (!room) return null;
    
    player.disconnect();
    
    // Grace period: wait 30s before removing
    room.disconnectTimers[player.id] = setTimeout(() => {
      this.finalizeDisconnect(room, player);
    }, 30000);
    
    this.socketToRoom.delete(socketId);
    this.socketToPlayer.delete(socketId);
    
    return { room, player };
  }

  finalizeDisconnect(room, player) {
    if (!player.isConnected) {
      const remaining = room.removePlayer(player.id);
      this.playerIdToSocket.delete(player.id);
      
      if (remaining === 0) {
        this.rooms.delete(room.id);
      }
    }
  }

  handleReconnect(socketId, playerId, roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    const player = room.getPlayer(playerId);
    if (!player) return null;
    
    // Clear disconnect timer
    if (room.disconnectTimers[player.id]) {
      clearTimeout(room.disconnectTimers[player.id]);
      delete room.disconnectTimers[player.id];
    }
    
    player.reconnect(socketId);
    this.socketToRoom.set(socketId, room.id);
    this.socketToPlayer.set(socketId, player);
    this.playerIdToSocket.set(player.id, socketId);
    
    return { room, player };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRoomBySocket(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  getPlayerBySocket(socketId) {
    return this.socketToPlayer.get(socketId);
  }

  getRoomCount() {
    return this.rooms.size;
  }

  getPlayerCount() {
    let count = 0;
    this.rooms.forEach(room => {
      count += room.getConnectedPlayers().length;
    });
    return count;
  }

  cleanupStaleRooms() {
    const now = Date.now();
    const staleThreshold = 60 * 60 * 1000; // 1 hour
    
    for (const [id, room] of this.rooms) {
      if (room.getConnectedPlayers().length === 0 && (now - room.createdAt) > staleThreshold) {
        this.rooms.delete(id);
      }
    }
  }
}

module.exports = GameManager;
