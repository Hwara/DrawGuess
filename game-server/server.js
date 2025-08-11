const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Redis 클라이언트 설정
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'redis-master.redis.svc.cluster.local',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || 'drawguess2024'
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('DrawGuess Game Server - Running on Kubernetes!');
});

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('player-joined', socket.id);
  });
  
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`DrawGuess server running on port ${PORT}`);
});
