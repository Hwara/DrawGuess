// DrawGuess Socket.IO 실시간 게임 서버 v3.0.3
// 하이브리드 클라우드 환경에서 멀티플레이어 캐치마인드 게임

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('redis');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);

// CORS 설정 (외부에서 접근 가능하도록)
app.use(cors({
  origin: [
    'https://hwara-dev.kr',
    'http://172.30.1.101',
    'http://172.30.1.102:3000',
    'http://localhost:3000',
    'https://api.hwara-dev.kr',
    'http://api.hwara-dev.kr',
    'file://', // 로컬 HTML 파일 접근 허용
    '*' // 개발 환경에서 모든 origin 허용
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Socket.IO 설정 (CORS 포함)
const io = socketIo(server, {
  cors: {
    origin: [
      'https://hwara-dev.kr',
      'http://172.30.1.101',
      'http://172.30.1.102:3000',
      'http://localhost:3000',
      'file://', // 로컬 HTML 파일 허용
      '*' // 개발 환경에서 모든 origin 허용
    ],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  // 연결 최적화
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true,
  transports: ['websocket', 'polling'],
  // 추가 설정
  allowEIO3: true // Engine.IO v3 호환성
});

// Redis 클라이언트 설정 (게임 세션 관리용)
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'redis-master.redis.svc.cluster.local',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    connectTimeout: 10000,
    commandTimeout: 5000,
  }
};
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

const redisClient = createClient(redisConfig);
const redisPub = createClient(redisConfig);
const redisSub = createClient(redisConfig);

// PostgreSQL 연결 풀 설정 (영구 데이터용)
const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'drawguess',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// 게임 상태 관리
const gameRooms = new Map(); // 메모리 내 빠른 접근용
const connectedUsers = new Map(); // 사용자 연결 정보

// 게임 설정
const GAME_SETTINGS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  ROUND_TIME: 90, // 90초
  WORDS: [
    // 쉬운 단어들
    '고양이', '강아지', '집', '자동차', '나무', '꽃', '태양', '달',
    '물고기', '새', '사과', '바나나', '케이크', '피자', '모자', '신발',
    // 보통 단어들  
    '컴퓨터', '비행기', '기차', '병원', '학교', '도서관', '영화관', '카페',
    '우산', '안경', '시계', '카메라', '키보드', '마우스', '헤드폰', '스마트폰',
    // 어려운 단어들
    '라즈베리파이', '쿠버네티스', '하이브리드클라우드', '마이크로서비스', '컨테이너',
    '로드밸런서', '오케스트레이션', '스케일링', '모니터링', '파이프라인'
  ]
};

// ===== Redis 연결 설정 =====
async function initializeRedis() {
  try {
    await redisClient.connect();
    await redisPub.connect();
    await redisSub.connect();

    console.log('✅ Redis 클라이언트 연결 성공');

    // Redis Pub/Sub으로 다중 포드 간 통신 설정
    redisSub.subscribe('game:events', (message) => {
      const event = JSON.parse(message);
      io.to(event.room).emit(event.type, event.data);
    });

  } catch (error) {
    console.error('❌ Redis 연결 실패:', error);
  }
}

// ===== PostgreSQL 연결 확인 =====
async function initializePostgreSQL() {
  try {
    const client = await pgPool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ PostgreSQL 연결 성공:', result.rows[0].now);
  } catch (error) {
    console.error('❌ PostgreSQL 연결 실패:', error);
  }
}

// ===== 게임 룸 관리 함수들 =====
class GameRoom {
  constructor(roomId, creator, roomName = null) {
    this.roomId = roomId;
    this.roomName = roomName || `${creator.username}의 방`;
    this.creator = creator;
    this.players = new Map();
    this.status = 'waiting'; // waiting, playing, finished
    this.currentRound = 0;
    this.maxRounds = 3;
    this.currentDrawer = null;
    this.currentWord = null;
    this.roundStartTime = null;
    this.drawingData = [];
    this.chatHistory = [];
    this.scores = new Map();
    this.gameSettings = { ...GAME_SETTINGS };
    this.createdAt = Date.now();

    this.addPlayer(creator);
  }

  addPlayer(player) {
    if (this.players.size >= this.gameSettings.MAX_PLAYERS) {
      throw new Error('방이 가득 참');
    }

    this.players.set(player.id, {
      id: player.id,
      username: player.username,
      isReady: false,
      isDrawing: false,
      score: 0,
      joinTime: Date.now()
    });

    this.scores.set(player.id, 0);
    console.log(`🎮 플레이어 ${player.username}이 방 ${this.roomId}에 참여`);
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    this.scores.delete(playerId);

    // 방장이 나가면 다른 플레이어를 방장으로
    if (this.creator.id === playerId && this.players.size > 0) {
      this.creator = Array.from(this.players.values())[0];
    }

    // 모든 플레이어가 나가면 방 삭제
    if (this.players.size === 0) {
      return true; // 방 삭제 신호
    }

    return false;
  }

  startGame() {
    if (this.players.size < this.gameSettings.MIN_PLAYERS) {
      throw new Error('최소 인원 부족');
    }

    this.status = 'playing';
    this.currentRound = 1;
    this.startNewRound();
  }

  startNewRound() {
    // 다음 그리는 사람 선택
    const playerIds = Array.from(this.players.keys());
    const currentIndex = this.currentDrawer ?
      playerIds.indexOf(this.currentDrawer) : -1;
    const nextIndex = (currentIndex + 1) % playerIds.length;
    this.currentDrawer = playerIds[nextIndex];

    // 단어 선택
    this.currentWord = this.gameSettings.WORDS[
      Math.floor(Math.random() * this.gameSettings.WORDS.length)
    ];

    this.roundStartTime = Date.now();
    this.drawingData = [];

    // 플레이어 상태 업데이트
    this.players.forEach((player, id) => {
      player.isDrawing = (id === this.currentDrawer);
    });

    console.log(`🎮 방 ${this.roomId} 라운드 ${this.currentRound} 시작 - 그리는 사람: ${this.currentDrawer}, 단어: ${this.currentWord}`);
  }

  checkAnswer(playerId, answer) {
    if (this.status !== 'playing' || playerId === this.currentDrawer) {
      return false;
    }

    const isCorrect = answer.toLowerCase().trim() === this.currentWord.toLowerCase().trim();

    if (isCorrect) {
      // 점수 계산 (빨리 맞힐수록 높은 점수)
      const timeElapsed = Date.now() - this.roundStartTime;
      const timeBonus = Math.max(0, this.gameSettings.ROUND_TIME - Math.floor(timeElapsed / 1000));
      const points = 100 + timeBonus;

      this.scores.set(playerId, this.scores.get(playerId) + points);
      this.scores.set(this.currentDrawer, this.scores.get(this.currentDrawer) + 50); // 그린 사람도 점수

      console.log(`🎯 플레이어 ${playerId}가 정답 "${this.currentWord}" 맞춤! (${points}점)`);
    }

    return isCorrect;
  }

  endRound() {
    if (this.currentRound >= this.maxRounds) {
      this.endGame();
    } else {
      this.currentRound++;
      this.startNewRound();
    }
  }

  endGame() {
    this.status = 'finished';

    // 최종 순위 계산
    const finalScores = Array.from(this.scores.entries())
      .map(([playerId, score]) => ({
        playerId,
        username: this.players.get(playerId)?.username,
        score
      }))
      .sort((a, b) => b.score - a.score);

    console.log(`🏆 게임 종료 - 방 ${this.roomId} 최종 순위:`, finalScores);
    return finalScores;
  }

  getGameState() {
    return {
      roomId: this.roomId,
      roomName: this.roomName,
      status: this.status,
      players: Array.from(this.players.values()),
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      currentDrawer: this.currentDrawer,
      currentWord: this.status === 'playing' ?
        (this.currentDrawer ? this.currentWord : null) : null, // 그리는 사람만 단어 공개
      roundStartTime: this.roundStartTime,
      scores: Object.fromEntries(this.scores),
      drawingData: this.drawingData,
      chatHistory: this.chatHistory.slice(-50), // 최근 50개 메시지만
      createdAt: this.createdAt
    };
  }
}

// ===== Socket.IO 연결 처리 =====
io.on('connection', (socket) => {
  console.log(`🔌 새로운 연결: ${socket.id}`);

  // 사용자 등록
  socket.on('register', async (userData) => {
    try {
      const user = {
        id: socket.id,
        username: userData.username || `Player_${socket.id.slice(0, 6)}`,
        joinTime: Date.now()
      };

      connectedUsers.set(socket.id, user);
      socket.emit('registered', user);

      // 현재 방 목록 전송
      const rooms = Array.from(gameRooms.values()).map(room => ({
        roomId: room.roomId,
        roomName: room.roomName,
        playerCount: room.players.size,
        maxPlayers: room.gameSettings.MAX_PLAYERS,
        status: room.status,
        createdAt: room.createdAt
      }));

      socket.emit('room-list', rooms);

      console.log(`👤 사용자 등록: ${user.username} (${socket.id})`);

    } catch (error) {
      socket.emit('error', { message: '사용자 등록 실패', error: error.message });
    }
  });

  // 방 생성
  socket.on('create-room', async (roomData) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: '사용자 등록이 필요합니다' });
        return;
      }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const roomName = roomData.name || roomData.roomName || `${user.username}의 방`;
      const room = new GameRoom(roomId, user, roomName);

      gameRooms.set(roomId, room);
      socket.join(roomId);

      // Redis에 방 정보 저장
      await redisClient.setEx(`room:${roomId}`, 3600, JSON.stringify(room.getGameState()));

      socket.emit('room-created', room.getGameState());

      // 모든 클라이언트에 방 목록 업데이트 브로드캐스트
      io.emit('room-list-updated', {
        roomId: room.roomId,
        roomName: room.roomName,
        playerCount: room.players.size,
        maxPlayers: room.gameSettings.MAX_PLAYERS,
        status: room.status
      });

      console.log(`🏠 방 생성: ${roomId} (${roomName}) by ${user.username}`);

    } catch (error) {
      socket.emit('error', { message: '방 생성 실패', error: error.message });
    }
  });

  // 방 참여
  socket.on('join-room', async (data) => {
    try {
      const user = connectedUsers.get(socket.id);
      const room = gameRooms.get(data.roomId);

      if (!user || !room) {
        socket.emit('error', { message: '방을 찾을 수 없습니다' });
        return;
      }

      room.addPlayer(user);
      socket.join(data.roomId);

      // 방 상태 업데이트
      await redisClient.setEx(`room:${data.roomId}`, 3600, JSON.stringify(room.getGameState()));

      // 방의 모든 플레이어에게 업데이트 전송
      io.to(data.roomId).emit('room-updated', room.getGameState());

      // 모든 클라이언트에 방 목록 업데이트 브로드캐스트
      io.emit('room-list-updated', {
        roomId: room.roomId,
        roomName: room.roomName,
        playerCount: room.players.size,
        maxPlayers: room.gameSettings.MAX_PLAYERS,
        status: room.status
      });

      socket.emit('joined-room', room.getGameState());

    } catch (error) {
      socket.emit('error', { message: '방 참여 실패', error: error.message });
    }
  });

  // 방 나가기 (명시적)
  socket.on('leave-room', async (data) => {
    try {
      const user = connectedUsers.get(socket.id);
      const room = gameRooms.get(data.roomId);

      if (!user || !room) {
        socket.emit('error', { message: '방을 찾을 수 없습니다' });
        return;
      }

      // 방에서 플레이어 제거
      const shouldDeleteRoom = room.removePlayer(socket.id);
      socket.leave(data.roomId);

      if (shouldDeleteRoom) {
        // 방 삭제
        gameRooms.delete(data.roomId);
        await redisClient.del(`room:${data.roomId}`);
        console.log(`🗑️ 방 삭제됨: ${data.roomId}`);

        // 모든 클라이언트에 방 삭제 알림
        io.emit('room-deleted', { roomId: data.roomId });
      } else {
        // 방 상태 업데이트
        await redisClient.setEx(`room:${data.roomId}`, 3600, JSON.stringify(room.getGameState()));

        // 방의 나머지 플레이어들에게 업데이트 전송
        io.to(data.roomId).emit('room-updated', room.getGameState());

        // 모든 클라이언트에 방 목록 업데이트 브로드캐스트
        io.emit('room-list-updated', {
          roomId: room.roomId,
          roomName: room.roomName,
          playerCount: room.players.size,
          maxPlayers: room.gameSettings.MAX_PLAYERS,
          status: room.status
        });
      }

      socket.emit('left-room', { roomId: data.roomId });
      console.log(`🚪 플레이어 ${user.username}이 방 ${data.roomId}에서 나감`);

    } catch (error) {
      socket.emit('error', { message: '방 나가기 실패', error: error.message });
    }
  });

  // 게임 시작
  socket.on('start-game', async (data) => {
    try {
      const room = gameRooms.get(data.roomId);
      if (!room) return;

      room.startGame();

      // 게임 시작을 Redis로 다른 포드에 알림
      await redisPub.publish('game:events', JSON.stringify({
        type: 'game-started',
        room: data.roomId,
        data: room.getGameState()
      }));

      io.to(data.roomId).emit('game-started', room.getGameState());

    } catch (error) {
      socket.emit('error', { message: '게임 시작 실패', error: error.message });
    }
  });

  // 그림 그리기 데이터
  socket.on('drawing', async (data) => {
    const room = gameRooms.get(data.roomId);
    if (!room || room.currentDrawer !== socket.id) return;

    room.drawingData.push({
      ...data,
      timestamp: Date.now()
    });

    // 그리는 사람을 제외한 다른 플레이어들에게 브로드캐스트
    socket.to(data.roomId).emit('drawing', data);
  });

  // 채팅 메시지
  socket.on('chat-message', async (data) => {
    try {
      const user = connectedUsers.get(socket.id);
      const room = gameRooms.get(data.roomId);

      if (!user || !room) return;

      const message = {
        id: Date.now(),
        userId: socket.id,
        username: user.username,
        message: data.message,
        timestamp: Date.now(),
        isAnswer: false
      };

      // 정답 체크
      if (room.status === 'playing' && socket.id !== room.currentDrawer) {
        const isCorrect = room.checkAnswer(socket.id, data.message);
        if (isCorrect) {
          message.isAnswer = true;

          // 정답 맞춤 이벤트
          io.to(data.roomId).emit('correct-answer', {
            userId: socket.id,
            username: user.username,
            word: room.currentWord,
            score: room.scores.get(socket.id)
          });

          // 라운드 종료 체크 (모든 사람이 맞췄거나 시간 초과)
          setTimeout(() => {
            room.endRound();
            io.to(data.roomId).emit('round-ended', room.getGameState());
          }, 2000);
        }
      }

      room.chatHistory.push(message);
      io.to(data.roomId).emit('chat-message', message);

    } catch (error) {
      console.error('채팅 메시지 처리 오류:', error);
    }
  });

  // 연결 해제
  socket.on('disconnect', async () => {
    try {
      const user = connectedUsers.get(socket.id);
      if (user) {
        console.log(`🔌 연결 해제: ${user.username} (${socket.id})`);

        // 참여 중인 방에서 제거
        for (const [roomId, room] of gameRooms.entries()) {
          if (room.players.has(socket.id)) {
            const shouldDeleteRoom = room.removePlayer(socket.id);

            if (shouldDeleteRoom) {
              gameRooms.delete(roomId);
              await redisClient.del(`room:${roomId}`);
              console.log(`🗑️ 방 삭제됨: ${roomId} (마지막 플레이어 나감)`);

              // 모든 클라이언트에 방 삭제 알림
              io.emit('room-deleted', { roomId: roomId });
            } else {
              await redisClient.setEx(`room:${roomId}`, 3600, JSON.stringify(room.getGameState()));

              // 방의 나머지 플레이어들에게 업데이트 전송
              io.to(roomId).emit('room-updated', room.getGameState());

              // 모든 클라이언트에 방 목록 업데이트 브로드캐스트
              io.emit('room-list-updated', {
                roomId: room.roomId,
                roomName: room.roomName,
                playerCount: room.players.size,
                maxPlayers: room.gameSettings.MAX_PLAYERS,
                status: room.status
              });

              console.log(`🚪 플레이어 ${user.username}이 방 ${roomId}에서 자동 제거됨 (연결 해제)`);
            }
            break;
          }
        }
      }

      connectedUsers.delete(socket.id);

    } catch (error) {
      console.error('연결 해제 처리 오류:', error);
    }
  });
});

// ===== REST API 엔드포인트 =====

// 헬스체크 (기존 + Socket.IO 정보 추가)
app.get('/health', async (req, res) => {
  try {
    const redisStatus = await redisClient.ping();
    const pgResult = await pgPool.query('SELECT NOW()');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '3.0.0',
      location: 'raspberry-pi-k8s',
      services: {
        redis: {
          status: 'connected',
          ping: redisStatus
        },
        postgresql: {
          status: 'connected',
          time: pgResult.rows[0].now,
          version: pgResult.rows[0].version || 'PostgreSQL 17.5'
        },
        socketio: {
          status: 'active',
          connected_clients: io.engine.clientsCount,
          active_rooms: gameRooms.size,
          total_players: connectedUsers.size
        }
      },
      hybrid_cloud: {
        location: 'raspberry-pi-cluster',
        aws_connection: 'connected',
        tailscale: 'active'
      },
      config: {
        redis_host: process.env.REDIS_HOST,
        db_host: process.env.DB_HOST?.split('.')[0] + '...'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 실시간 통계 API
app.get('/api/stats', async (req, res) => {
  try {
    const activePlayers = connectedUsers.size;
    const activeRooms = gameRooms.size;
    const playingRooms = Array.from(gameRooms.values()).filter(room => room.status === 'playing').length;

    // PostgreSQL에서 역사적 데이터 조회
    const totalGamesResult = await pgPool.query('SELECT COUNT(*) as count FROM game_sessions');
    const totalUsersResult = await pgPool.query('SELECT COUNT(*) as count FROM users');
    const topScoresResult = await pgPool.query(`
      SELECT u.username, MAX(gs.score) as max_score 
      FROM game_scores gs 
      JOIN users u ON gs.user_id = u.id 
      GROUP BY u.username 
      ORDER BY max_score DESC 
      LIMIT 10
    `);

    res.json({
      realtime: {
        active_rooms: activeRooms,
        playing_rooms: playingRooms,
        active_players: activePlayers,
        socket_connections: io.engine.clientsCount
      },
      historical: {
        total_games: parseInt(totalGamesResult.rows[0].count),
        total_users: parseInt(totalUsersResult.rows[0].count),
        top_scores: topScoresResult.rows
      },
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      last_updated: new Date().toISOString()
    });
  }
});

// 방 목록 API
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = Array.from(gameRooms.values()).map(room => ({
      roomId: room.roomId,
      roomName: room.roomName,
      playerCount: room.players.size,
      maxPlayers: room.gameSettings.MAX_PLAYERS,
      status: room.status,
      currentRound: room.currentRound,
      maxRounds: room.maxRounds,
      createdAt: room.createdAt
    }));

    res.json({
      rooms,
      total_rooms: rooms.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== 서버 시작 =====
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initializeRedis();
    await initializePostgreSQL();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 DrawGuess 실시간 게임 서버 v3.0.0 시작됨`);
      console.log(`📡 포트: ${PORT}`);
      console.log(`🎮 Socket.IO 엔드포인트: http://0.0.0.0:${PORT}`);
      console.log(`🔍 헬스체크: http://0.0.0.0:${PORT}/health`);
      console.log(`📊 통계: http://0.0.0.0:${PORT}/api/stats`);
      console.log(`🏠 방 목록: http://0.0.0.0:${PORT}/api/rooms`);
      console.log(`🔗 CORS 허용: hwara-dev.kr, 172.30.1.102:3000, localhost:3000`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM 수신, 서버 종료 중...');
  await redisClient.quit();
  await redisPub.quit();
  await redisSub.quit();
  await pgPool.end();
  process.exit(0);
});

startServer();