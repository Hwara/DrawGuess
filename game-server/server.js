// DrawGuess Socket.IO 실시간 게임 서버 (리팩토링 버전)
// 하이브리드 클라우드 환경에서 멀티플레이어 캐치마인드 게임

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// 설정 모듈들
const {
  initializeRedis,
  initializePostgreSQL,
  checkRedisConnection,
  checkPostgreSQLConnection,
  redisSub
} = require('./config/database');
const {
  updateGameMetrics,
  updateDependencyMetrics,
  createHttpMetricsMiddleware
} = require('./config/prometheus');

// 라우트 및 핸들러들
const apiRoutes = require('./routes/apiRoutes');
const { setupSocketHandlers } = require('./socket/socketHandlers');

// Express 앱 및 서버 설정
const app = express();
const server = http.createServer(app);

// HTTP 요청 시간 측정 미들웨어
app.use(createHttpMetricsMiddleware());

// CORS 설정
app.use(cors({
  origin: [
    'https://hwara-dev.kr',    // 메인 웹사이트
    'http://localhost:3000',   // 개발환경
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Socket.IO 설정
const io = socketIo(server, {
  cors: {
    origin: [
      'https://hwara-dev.kr',    // 메인 웹사이트
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

// 게임 상태 관리
const gameRooms = new Map(); // 메모리 내 빠른 접근용
const connectedUsers = new Map(); // 사용자 연결 정보

// Express 앱에 공유 데이터 설정 (API 라우트에서 사용)
app.set('gameRooms', gameRooms);
app.set('connectedUsers', connectedUsers);
app.set('io', io);

// API 라우트 설정
app.use('/', apiRoutes);

// Socket.IO 이벤트 핸들러 설정
setupSocketHandlers(io, gameRooms, connectedUsers);

// Redis Pub/Sub 설정 (다중 포드 간 통신)
function setupRedisPubSub() {
  redisSub.subscribe('game:events', (message) => {
    try {
      const event = JSON.parse(message);
      io.to(event.room).emit(event.type, event.data);
      console.log(`📡 Redis 이벤트 처리: ${event.type} for room ${event.room}`);
    } catch (error) {
      console.error('Redis Pub/Sub 메시지 처리 오류:', error);
    }
  });
}

// 정기적으로 메트릭 업데이트 (5초마다)
function startMetricsUpdater() {
  setInterval(async () => {
    // 게임 메트릭 업데이트
    updateGameMetrics(gameRooms, connectedUsers, io);

    // 의존성 상태 확인 및 메트릭 업데이트
    const redisStatus = await checkRedisConnection();
    const pgStatus = await checkPostgreSQLConnection();
    updateDependencyMetrics(redisStatus, pgStatus);
  }, 5000);
}

// 서버 시작
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 데이터베이스 연결 초기화
    await initializeRedis();
    await initializePostgreSQL();

    // Redis Pub/Sub 설정
    setupRedisPubSub();

    // 메트릭 업데이트 시작
    startMetricsUpdater();

    // 서버 시작
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 DrawGuess 게임 서버 시작됨`);
      console.log(`📡 포트: ${PORT}`);
      console.log(`🔍 헬스체크: http://0.0.0.0:${PORT}/health`);
      console.log(`📊 통합 상태: http://0.0.0.0:${PORT}/api/status`);
      console.log(`📈 메트릭: http://0.0.0.0:${PORT}/metrics`);
      console.log(`🎮 Socket.IO: http://0.0.0.0:${PORT}`);
      console.log(`🔗 CORS 허용: hwara-dev.kr, localhost:3000`);
      console.log(`📁 모듈 구조: 리팩토링 완료 - 7개 파일로 분리`);
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
    const { redisClient, redisPub, redisSub, pgPool } = require('./config/database');
    await redisClient.quit();
    await redisPub.quit();
    await redisSub.quit();
    await pgPool.end();
    console.log('✅ 모든 연결 정리 완료');
  } catch (error) {
    console.error('종료 중 오류:', error);
  }
  process.exit(0);
});

// 처리되지 않은 예외 처리
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 서버 시작
startServer();