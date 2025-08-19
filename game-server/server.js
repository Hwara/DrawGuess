// DrawGuess Socket.IO 실시간 게임 서버
// 하이브리드 클라우드 환경에서 멀티플레이어 캐치마인드 게임

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('redis');
const { Pool } = require('pg');
const promClient = require('prom-client');

const app = express();
const server = http.createServer(app);

// ===== Prometheus 메트릭 설정 (명세서 기준) =====
const register = new promClient.Registry();

// 게임 서버 전용 커스텀 메트릭 정의 (명세서 기준)
const gameMetrics = {
  // 서비스 정보
  info: new promClient.Gauge({
    name: 'drawguess_info',
    help: 'DrawGuess service information',
    labelNames: ['version', 'environment', 'node_version'],
    registers: [register]
  }),

  uptime: new promClient.Gauge({
    name: 'drawguess_uptime_seconds',
    help: 'Process uptime in seconds',
    registers: [register]
  }),

  // 게임 메트릭
  gameRoomsActive: new promClient.Gauge({
    name: 'drawguess_game_rooms_active',
    help: 'Current number of active game rooms',
    registers: [register]
  }),

  playersActive: new promClient.Gauge({
    name: 'drawguess_players_active',
    help: 'Current number of active players',
    registers: [register]
  }),

  socketioConnections: new promClient.Gauge({
    name: 'drawguess_socketio_connections',
    help: 'Current Socket.IO connections',
    registers: [register]
  }),

  // HTTP 메트릭
  httpRequestsTotal: new promClient.Counter({
    name: 'drawguess_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'status_code'],
    registers: [register]
  }),

  httpConnectionsActive: new promClient.Gauge({
    name: 'drawguess_http_connections_active',
    help: 'Current active HTTP connections',
    registers: [register]
  }),

  httpResponseTimeMs: new promClient.Gauge({
    name: 'drawguess_http_response_time_ms',
    help: 'Average HTTP response time in milliseconds',
    registers: [register]
  }),

  // 의존성 상태
  redisConnectionStatus: new promClient.Gauge({
    name: 'drawguess_redis_connection_status',
    help: 'Redis connection status (1=up, 0=down)',
    registers: [register]
  }),

  redisResponseTimeMs: new promClient.Gauge({
    name: 'drawguess_redis_response_time_ms',
    help: 'Redis command response time in milliseconds',
    registers: [register]
  }),

  postgresqlConnectionStatus: new promClient.Gauge({
    name: 'drawguess_postgresql_connection_status',
    help: 'PostgreSQL connection status (1=up, 0=down)',
    registers: [register]
  }),

  postgresqlResponseTimeMs: new promClient.Gauge({
    name: 'drawguess_postgresql_response_time_ms',
    help: 'PostgreSQL query response time in milliseconds',
    registers: [register]
  }),

  // Node.js 런타임 메트릭
  nodejsHeapUsedBytes: new promClient.Gauge({
    name: 'drawguess_nodejs_heap_used_bytes',
    help: 'Node.js heap memory used in bytes',
    registers: [register]
  }),

  nodejsHeapTotalBytes: new promClient.Gauge({
    name: 'drawguess_nodejs_heap_total_bytes',
    help: 'Node.js heap memory total in bytes',
    registers: [register]
  }),

  nodejsExternalBytes: new promClient.Gauge({
    name: 'drawguess_nodejs_external_bytes',
    help: 'Node.js external memory in bytes',
    registers: [register]
  }),

  nodejsRssBytes: new promClient.Gauge({
    name: 'drawguess_nodejs_rss_bytes',
    help: 'Node.js resident set size in bytes',
    registers: [register]
  })
};

// HTTP 요청 추적을 위한 변수들
let httpRequestDurations = [];
let activeHttpConnections = 0;

// HTTP 요청 시간 측정 미들웨어
app.use((req, res, next) => {
  const start = Date.now();
  activeHttpConnections++;

  res.on('finish', () => {
    const duration = Date.now() - start;

    // 메트릭 업데이트
    gameMetrics.httpRequestsTotal
      .labels(req.method, res.statusCode)
      .inc();

    // 평균 응답시간 계산을 위해 저장 (최근 100개만)
    httpRequestDurations.push(duration);
    if (httpRequestDurations.length > 100) {
      httpRequestDurations = httpRequestDurations.slice(-100);
    }

    activeHttpConnections--;
  });

  next();
});

// CORS 설정 (수정: API 도메인 제거)
app.use(cors({
  origin: [
    'https://hwara-dev.kr',    // 메인 웹사이트만
    'http://localhost:3000',   // 개발환경
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Socket.IO 설정 (수정: API 도메인 제거)
const io = socketIo(server, {
  cors: {
    origin: [
      'https://hwara-dev.kr',    // 메인 웹사이트만
      'http://localhost:3000',   // 개발환경
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true,
  transports: ['websocket', 'polling'],
  allowEIO3: true
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

// ===== 메트릭 업데이트 함수 =====
function updateGameMetrics() {
  try {
    // 서비스 정보
    gameMetrics.info
      .labels(
        process.env.npm_package_version || '3.0.5',
        process.env.NODE_ENV || 'production',
        process.version
      )
      .set(1);

    gameMetrics.uptime.set(process.uptime());

    // 게임 메트릭
    gameMetrics.gameRoomsActive.set(gameRooms.size);
    gameMetrics.playersActive.set(connectedUsers.size);
    gameMetrics.socketioConnections.set(io.engine.clientsCount);

    // HTTP 메트릭
    gameMetrics.httpConnectionsActive.set(activeHttpConnections);

    if (httpRequestDurations.length > 0) {
      const avgResponseTime = httpRequestDurations.reduce((a, b) => a + b, 0) / httpRequestDurations.length;
      gameMetrics.httpResponseTimeMs.set(avgResponseTime);
    }

    // Node.js 런타임 메트릭
    const memUsage = process.memoryUsage();
    gameMetrics.nodejsHeapUsedBytes.set(memUsage.heapUsed);
    gameMetrics.nodejsHeapTotalBytes.set(memUsage.heapTotal);
    gameMetrics.nodejsExternalBytes.set(memUsage.external);
    gameMetrics.nodejsRssBytes.set(memUsage.rss);

  } catch (error) {
    console.error('메트릭 업데이트 오류:', error);
  }
}

// 의존성 상태 확인 함수들
async function checkRedisConnection() {
  try {
    const start = Date.now();
    await redisClient.ping();
    const responseTime = Date.now() - start;

    gameMetrics.redisConnectionStatus.set(1);
    gameMetrics.redisResponseTimeMs.set(responseTime);

    return { status: 'healthy', responseTime };
  } catch (error) {
    gameMetrics.redisConnectionStatus.set(0);
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkPostgreSQLConnection() {
  try {
    const start = Date.now();
    const result = await pgPool.query('SELECT 1 as health');
    const responseTime = Date.now() - start;

    gameMetrics.postgresqlConnectionStatus.set(1);
    gameMetrics.postgresqlResponseTimeMs.set(responseTime);

    return { status: 'healthy', responseTime };
  } catch (error) {
    gameMetrics.postgresqlConnectionStatus.set(0);
    return { status: 'unhealthy', error: error.message };
  }
}

// 정기적으로 메트릭 업데이트 (5초마다)
setInterval(async () => {
  updateGameMetrics();
  await checkRedisConnection();
  await checkPostgreSQLConnection();
}, 5000);

// ===== Prometheus 쿼리 클라이언트 =====
const PROMETHEUS_URL = 'http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090';

async function queryPrometheus(query) {
  try {
    const response = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`, {
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`Prometheus API 오류: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'success' && data.data.result.length > 0) {
      return parseFloat(data.data.result[0].value[1]);
    }

    return null;
  } catch (error) {
    console.warn(`Prometheus 쿼리 실패 (${query}):`, error.message);
    return null;
  }
}

async function getAllMetricsFromPrometheus() {
  const queries = {
    // 시스템 메트릭
    node_memory_total: 'node_memory_MemTotal_bytes',
    node_memory_available: 'node_memory_MemAvailable_bytes',
    system_memory_usage_percent: '(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100',
    system_cpu_usage_percent: '(1 - rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100',
    node_load1: 'node_load1',
    system_disk_usage_percent: '(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100',

    // 애플리케이션 메트릭
    drawguess_uptime_seconds: 'drawguess_uptime_seconds',
    drawguess_game_rooms_active: 'drawguess_game_rooms_active',
    drawguess_players_active: 'drawguess_players_active',
    drawguess_http_requests_total: 'drawguess_http_requests_total',
    drawguess_http_response_time_ms: 'drawguess_http_response_time_ms',
    drawguess_nodejs_heap_used_bytes: 'drawguess_nodejs_heap_used_bytes',
    drawguess_nodejs_heap_total_bytes: 'drawguess_nodejs_heap_total_bytes',
    nodejs_heap_usage_percent: '(drawguess_nodejs_heap_used_bytes / drawguess_nodejs_heap_total_bytes) * 100',
    drawguess_redis_connection_status: 'drawguess_redis_connection_status',
    drawguess_redis_response_time_ms: 'drawguess_redis_response_time_ms',
    drawguess_postgresql_connection_status: 'drawguess_postgresql_connection_status',
    drawguess_postgresql_response_time_ms: 'drawguess_postgresql_response_time_ms',
    drawguess_nodejs_external_bytes: 'drawguess_nodejs_external_bytes',
    drawguess_nodejs_rss_bytes: 'drawguess_nodejs_rss_bytes',

    // 트렌드 분석 (5분 전과 비교)
    game_rooms_change_5m: 'drawguess_game_rooms_active - (drawguess_game_rooms_active offset 5m)',
    players_change_5m: 'drawguess_players_active - (drawguess_players_active offset 5m)',
    response_time_change_5m: 'drawguess_http_response_time_ms - (drawguess_http_response_time_ms offset 5m)'
  };

  const results = {};

  // 병렬로 모든 쿼리 실행
  await Promise.all(
    Object.entries(queries).map(async ([key, query]) => {
      results[key] = await queryPrometheus(query);
    })
  );

  return results;
}

// ===== 유틸리티 함수들 =====
function formatBytes(bytes) {
  if (bytes === 0 || bytes === null) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  if (!seconds) return '0s';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}
// Redis에 그림 히스토리 저장
async function saveDrawingToRedis(roomId, drawingPoint) {
  try {
    const key = `room:${roomId}:drawing:history`;

    // List에 추가 (최대 1000개 포인트로 제한)
    await redisClient.lpush(key, JSON.stringify(drawingPoint));
    await redisClient.ltrim(key, 0, 999); // 오래된 데이터는 자동 삭제

    // TTL 설정 (2시간 후 자동 삭제)
    await redisClient.expire(key, 7200);

    console.log(`💾 그림 데이터 Redis 저장: ${roomId}`);
  } catch (error) {
    console.error('Redis 그림 저장 오류:', error);
  }
}

// Redis에서 그림 히스토리 조회
async function getDrawingHistoryFromRedis(roomId) {
  try {
    const key = `room:${roomId}:drawing:history`;
    const historyStrings = await redisClient.lrange(key, 0, -1);

    // 최신순으로 정렬 (Redis List는 최신이 앞에 오므로 역순)
    const history = historyStrings
      .reverse()
      .map(str => JSON.parse(str))
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log(`📖 Redis에서 그림 히스토리 조회: ${roomId} (${history.length}개)`);
    return history;
  } catch (error) {
    console.error('Redis 그림 조회 오류:', error);
    return [];
  }
}

// 방 삭제 시 그림 데이터 정리
async function cleanupRoomDrawing(roomId) {
  try {
    const key = `room:${roomId}:drawing:history`;
    await redisClient.del(key);
    console.log(`🗑️ 방 ${roomId} 그림 데이터 정리 완료`);
  } catch (error) {
    console.error('그림 데이터 정리 오류:', error);
  }
}

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

// ===== 게임 룸 관리 클래스 =====
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
    this.drawingData = []; // 새 라운드 시 그림 초기화

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

  // 그림 포인트 추가 (향상된 버전)
  addDrawingPoint(drawingPoint) {
    const enhancedPoint = {
      ...drawingPoint,
      timestamp: Date.now(),
      userId: drawingPoint.userId || this.currentDrawer
    };

    this.drawingData.push(enhancedPoint);
    return enhancedPoint;
  }

  // 캔버스 지우기
  clearCanvas(userId) {
    const clearEvent = {
      type: 'clear',
      userId: userId,
      timestamp: Date.now()
    };

    this.drawingData.push(clearEvent);
    return clearEvent;
  }

  // 그림 히스토리 가져오기 (최근 1000개 제한)
  getDrawingHistory() {
    return this.drawingData.slice(-1000);
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

      try {
        const drawingHistory = await getDrawingHistoryFromRedis(data.roomId);
        if (drawingHistory && drawingHistory.length > 0) {
          socket.emit('drawing-history', drawingHistory);
          console.log(`🎨 그림 히스토리 전송: ${drawingHistory.length}개 포인트`);
        }
      } catch (error) {
        console.error('그림 히스토리 전송 오류:', error);
      }
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
        await cleanupRoomDrawing(data.roomId);
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
    try {
      const { roomId, ...drawingPoint } = data;
      const room = gameRooms.get(roomId);

      // 권한 확인: 방에 속해 있고, 현재 그리는 사람인지
      if (!room || room.currentDrawer !== socket.id) {
        console.log(`🚫 그리기 권한 없음: ${socket.id} in room ${roomId}`);
        return;
      }

      // DrawingPoint에 서버 정보 추가
      const enhancedDrawingPoint = {
        ...drawingPoint,
        userId: socket.id,
        timestamp: Date.now()
      };

      // 메모리와 Redis에 저장
      room.addDrawingPoint(enhancedDrawingPoint);
      await saveDrawingToRedis(roomId, enhancedDrawingPoint);

      // 다른 플레이어들에게 브로드캐스트 (자기 제외)
      socket.to(roomId).emit('drawing', enhancedDrawingPoint);

      console.log(`🎨 그림 데이터 처리 완료: ${socket.id} in room ${roomId}`);

    } catch (error) {
      console.error('그리기 이벤트 처리 오류:', error);
      socket.emit('error', { message: '그리기 처리 중 오류가 발생했습니다.' });
    }
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
              await cleanupRoomDrawing(roomId);
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

  // 캔버스 전체 지우기
  socket.on('clear-canvas', async (data) => {
    try {
      const { roomId } = data;
      const room = gameRooms.get(roomId);

      // 권한 확인: 방에 속해 있고, 현재 그리는 사람인지
      if (!room || room.currentDrawer !== socket.id) {
        socket.emit('error', { message: '캔버스를 지울 권한이 없습니다.' });
        return;
      }

      // Clear 이벤트 생성
      const clearEvent = room.clearCanvas(socket.id);
      await saveDrawingToRedis(roomId, clearEvent);

      // 모든 사용자에게 브로드캐스트 (자기 포함)
      io.to(roomId).emit('canvas-cleared', {
        roomId,
        userId: socket.id,
        timestamp: clearEvent.timestamp
      });

      console.log(`🧹 캔버스 지우기: ${socket.id} in room ${roomId}`);

    } catch (error) {
      console.error('캔버스 지우기 오류:', error);
      socket.emit('error', { message: '캔버스 지우기 중 오류가 발생했습니다.' });
    }
  });

});

// ===== REST API 엔드포인트 =====

// 1. Prometheus 메트릭 엔드포인트 (명세서 기준)
app.get('/metrics', async (req, res) => {
  try {
    // 최신 메트릭 업데이트
    updateGameMetrics();
    await checkRedisConnection();
    await checkPostgreSQLConnection();

    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('메트릭 수집 오류:', error);
    res.status(500).send('# Metrics collection failed\n# Error: ' + error.message);
  }
});

// 2. 통합 상태 API (명세서 기준) - 핵심!
app.get('/api/status', async (req, res) => {
  const startTime = Date.now();

  try {
    // Prometheus에서 모든 메트릭 조회
    const allMetrics = await getAllMetricsFromPrometheus();

    // 직접 수집한 메트릭 (Prometheus가 안 될 때 대비)
    const directMetrics = {
      gameRooms: gameRooms.size,
      players: connectedUsers.size,
      socketConnections: io.engine.clientsCount,
      uptime: process.uptime()
    };

    // 전체 상태 계산
    const redisHealthy = (allMetrics.drawguess_redis_connection_status === 1);
    const pgHealthy = (allMetrics.drawguess_postgresql_connection_status === 1);
    const memoryUsage = allMetrics.nodejs_heap_usage_percent || 0;

    let overallStatus = 'healthy';
    let overallScore = 100;
    const issues = [];

    if (!redisHealthy) {
      overallStatus = 'degraded';
      overallScore -= 30;
      issues.push('Redis connection failed');
    }

    if (!pgHealthy) {
      overallStatus = 'degraded';
      overallScore -= 30;
      issues.push('PostgreSQL connection failed');
    }

    if (memoryUsage > 90) {
      overallStatus = 'degraded';
      overallScore -= 20;
      issues.push('High memory usage (>90%)');
    }

    const status = {
      timestamp: new Date().toISOString(),
      service: 'DrawGuess Game Server',
      version: process.env.npm_package_version || '3.0.5',
      environment: process.env.NODE_ENV || 'production',
      responseTime: Date.now() - startTime,

      overall: {
        status: overallStatus,
        score: Math.max(0, overallScore),
        issues: issues
      },

      // 시스템 메트릭 (Prometheus에서 조회)
      system: allMetrics.node_memory_total ? {
        memory: {
          total: formatBytes(allMetrics.node_memory_total),
          available: formatBytes(allMetrics.node_memory_available),
          usage: (allMetrics.system_memory_usage_percent || 0).toFixed(1) + '%',
          status: (allMetrics.system_memory_usage_percent || 0) > 90 ? 'critical' :
            (allMetrics.system_memory_usage_percent || 0) > 80 ? 'warning' : 'normal'
        },
        cpu: {
          usage: (allMetrics.system_cpu_usage_percent || 0).toFixed(1) + '%',
          loadAverage: (allMetrics.node_load1 || 0).toFixed(2),
          cores: require('os').cpus().length,
          status: (allMetrics.system_cpu_usage_percent || 0) > 80 ? 'warning' : 'normal'
        },
        disk: {
          usage: (allMetrics.system_disk_usage_percent || 0).toFixed(1) + '%',
          status: (allMetrics.system_disk_usage_percent || 0) > 90 ? 'critical' : 'normal'
        },
        network: {
          rxRate: 'N/A', // 복잡한 계산이므로 일단 제외
          txRate: 'N/A',
          status: 'normal'
        }
      } : {
        error: 'System metrics unavailable - Prometheus connection failed'
      },

      // 애플리케이션 메트릭
      application: {
        uptime: {
          seconds: allMetrics.drawguess_uptime_seconds || directMetrics.uptime,
          human: formatUptime(allMetrics.drawguess_uptime_seconds || directMetrics.uptime)
        },
        performance: {
          httpRequests: allMetrics.drawguess_http_requests_total || 0,
          avgResponseTime: (allMetrics.drawguess_http_response_time_ms || 0).toFixed(1) + 'ms',
          activeConnections: activeHttpConnections,
          status: (allMetrics.drawguess_http_response_time_ms || 0) > 1000 ? 'warning' : 'excellent'
        },
        gameMetrics: {
          activeRooms: allMetrics.drawguess_game_rooms_active || directMetrics.gameRooms,
          activePlayers: allMetrics.drawguess_players_active || directMetrics.players,
          socketConnections: allMetrics.drawguess_socketio_connections || directMetrics.socketConnections,
          avgPlayersPerRoom: allMetrics.drawguess_game_rooms_active > 0 ?
            ((allMetrics.drawguess_players_active || directMetrics.players) /
              (allMetrics.drawguess_game_rooms_active || directMetrics.gameRooms)).toFixed(1) : 0,
          status: (allMetrics.drawguess_game_rooms_active || directMetrics.gameRooms) > 0 ? 'active' : 'idle'
        },
        runtime: {
          nodejs: {
            version: process.version,
            heapUsed: formatBytes(allMetrics.drawguess_nodejs_heap_used_bytes),
            heapTotal: formatBytes(allMetrics.drawguess_nodejs_heap_total_bytes),
            heapUsage: (allMetrics.nodejs_heap_usage_percent || 0).toFixed(1) + '%',
            external: formatBytes(allMetrics.drawguess_nodejs_external_bytes),
            rss: formatBytes(allMetrics.drawguess_nodejs_rss_bytes)
          },
          memory: {
            status: (allMetrics.nodejs_heap_usage_percent || 0) > 85 ? 'warning' : 'normal'
          }
        },
        dependencies: {
          redis: {
            status: redisHealthy ? 'healthy' : 'unhealthy',
            responseTime: allMetrics.drawguess_redis_response_time_ms ?
              allMetrics.drawguess_redis_response_time_ms.toFixed(1) + 'ms' : 'N/A',
            lastCheck: new Date().toISOString()
          },
          postgresql: {
            status: pgHealthy ? 'healthy' : 'unhealthy',
            responseTime: allMetrics.drawguess_postgresql_response_time_ms ?
              allMetrics.drawguess_postgresql_response_time_ms.toFixed(1) + 'ms' : 'N/A',
            lastCheck: new Date().toISOString()
          }
        }
      },

      // 트렌드 분석 (5분 전과 비교)
      trends: {
        gameRooms: {
          current: allMetrics.drawguess_game_rooms_active || directMetrics.gameRooms,
          change5m: allMetrics.game_rooms_change_5m ?
            (allMetrics.game_rooms_change_5m > 0 ? '+' : '') + allMetrics.game_rooms_change_5m : '0',
          trend: !allMetrics.game_rooms_change_5m ? 'stable' :
            allMetrics.game_rooms_change_5m > 0 ? 'increasing' : 'decreasing'
        },
        players: {
          current: allMetrics.drawguess_players_active || directMetrics.players,
          change5m: allMetrics.players_change_5m ?
            (allMetrics.players_change_5m > 0 ? '+' : '') + allMetrics.players_change_5m : '0',
          trend: !allMetrics.players_change_5m ? 'stable' :
            allMetrics.players_change_5m > 0 ? 'increasing' : 'decreasing'
        },
        responseTime: {
          current: allMetrics.drawguess_http_response_time_ms || 0,
          change5m: allMetrics.response_time_change_5m ?
            (allMetrics.response_time_change_5m > 0 ? '+' : '') + allMetrics.response_time_change_5m.toFixed(1) : '0',
          trend: !allMetrics.response_time_change_5m ? 'stable' :
            allMetrics.response_time_change_5m < 0 ? 'improving' : 'degrading'
        },
        memoryUsage: {
          current: allMetrics.nodejs_heap_usage_percent || 0,
          change5m: 'N/A', // 계산 복잡하므로 일단 제외
          trend: 'stable'
        }
      },

      prometheus: {
        connected: allMetrics.drawguess_uptime_seconds !== null,
        lastScrape: allMetrics.drawguess_uptime_seconds ? new Date().toISOString() : null,
        metricsCount: Object.values(allMetrics).filter(v => v !== null).length,
        queryTime: (Date.now() - startTime) + 'ms'
      }
    };

    // HTTP 상태 코드 결정
    const httpStatus = overallStatus === 'healthy' ? 200 : 503;
    res.status(httpStatus).json(status);

  } catch (error) {
    console.error('Status API 오류:', error);

    // Fallback: 직접 수집 데이터만 사용
    res.status(502).json({
      timestamp: new Date().toISOString(),
      service: 'DrawGuess Game Server',
      responseTime: Date.now() - startTime,
      overall: {
        status: 'degraded',
        score: 40,
        issues: ['Prometheus connection failed - limited metrics available']
      },
      application: {
        gameMetrics: {
          activeRooms: gameRooms.size,
          activePlayers: connectedUsers.size,
          status: 'active',
          note: 'Direct collection - Prometheus unavailable'
        },
        dependencies: {
          redis: await checkRedisConnection(),
          postgresql: await checkPostgreSQLConnection()
        }
      },
      prometheus: {
        connected: false,
        error: error.message,
        lastAttempt: new Date().toISOString()
      }
    });
  }
});

// 3. 기본 헬스체크 (명세서 기준)
app.get('/health', async (req, res) => {
  try {
    const redisStatus = await checkRedisConnection();
    const pgStatus = await checkPostgreSQLConnection();

    const isHealthy = redisStatus.status === 'healthy' && pgStatus.status === 'healthy';
    const errors = [];

    if (redisStatus.status !== 'healthy') errors.push('Redis connection failed');
    if (pgStatus.status !== 'healthy') errors.push('PostgreSQL connection failed');

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '3.0.5'
    };

    if (!isHealthy) {
      response.errors = errors;
    }

    res.status(isHealthy ? 200 : 503).json(response);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '3.0.5',
      errors: [error.message]
    });
  }
});

// 개발 중 디버깅용 - 특정 방의 그림 히스토리 확인
app.get('/api/debug/drawing/:roomId', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).send('Not found');
  }

  try {
    const { roomId } = req.params;
    const history = await getDrawingHistoryFromRedis(roomId);
    const room = gameRooms.get(roomId);

    res.json({
      roomId,
      drawingPointsCount: history.length,
      redisHistory: history.slice(-10), // Redis 최근 10개
      memoryHistory: room ? room.getDrawingHistory().slice(-10) : [], // 메모리 최근 10개
      currentDrawer: room ? room.currentDrawer : null,
      gameStatus: room ? room.status : 'not found'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 개발 시 테스트용으로만 사용 (프로덕션에서는 비활성화)
app.post('/api/debug/test-drawing/:roomId', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).send('Not found');
  }

  try {
    const { roomId } = req.params;
    const room = gameRooms.get(roomId);

    if (!room) {
      return res.status(404).json({ error: '방을 찾을 수 없습니다' });
    }

    // 테스트 그리기 포인트 생성
    const testDrawingPoint = {
      type: 'line',
      x: Math.floor(Math.random() * 400) + 100,
      y: Math.floor(Math.random() * 300) + 100,
      prevX: Math.floor(Math.random() * 400) + 100,
      prevY: Math.floor(Math.random() * 300) + 100,
      color: '#000000',
      lineWidth: 3,
      userId: 'test-user',
      timestamp: Date.now()
    };

    // Redis에 저장
    await saveDrawingToRedis(roomId, testDrawingPoint);

    // 방의 모든 사용자에게 브로드캐스트
    io.to(roomId).emit('drawing', testDrawingPoint);

    res.json({
      message: '테스트 그리기 포인트 생성됨',
      drawingPoint: testDrawingPoint
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

    // 초기 메트릭 설정
    updateGameMetrics();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 DrawGuess 게임 서버 시작됨`);
      console.log(`📡 포트: ${PORT}`);
      console.log(`🔍 헬스체크: http://0.0.0.0:${PORT}/health`);
      console.log(`📊 통합 상태: http://0.0.0.0:${PORT}/api/status`);
      console.log(`📈 메트릭: http://0.0.0.0:${PORT}/metrics`);
      console.log(`🎮 Socket.IO: http://0.0.0.0:${PORT}`);
      console.log(`🔗 CORS 허용: hwara-dev.kr, localhost:3000`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM 수신, 서버 종료 중...');
  try {
    await redisClient.quit();
    await redisPub.quit();
    await redisSub.quit();
    await pgPool.end();
  } catch (error) {
    console.error('종료 중 오류:', error);
  }
  process.exit(0);
});

startServer();