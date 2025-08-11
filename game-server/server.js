const express = require('express');
const { createClient } = require('redis');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 환경변수 디버깅 출력
console.log('🔧 환경변수 확인:');
console.log('REDIS_HOST:', process.env.REDIS_HOST);
console.log('REDIS_PORT:', process.env.REDIS_PORT);
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? '***' : 'undefined');
console.log('DB_HOST:', process.env.DB_HOST);

// Redis 클라이언트 설정 (수정된 버전)
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'redis-master.redis.svc.cluster.local',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    // 연결 타임아웃 설정
    connectTimeout: 10000,
    commandTimeout: 5000,
  }
};

// Redis 패스워드가 있다면 추가
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

console.log('🔧 Redis 설정:', {
  host: redisConfig.socket.host,
  port: redisConfig.socket.port,
  hasPassword: !!redisConfig.password
});

const redisClient = createClient(redisConfig);

// PostgreSQL 클라이언트 설정 (AWS RDS via Tailscale)
const pgConfig = {
  host: process.env.DB_HOST || 'drawguess-dev-postgres.c9q0ka8k2c68.ap-northeast-2.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'drawguess',
  user: process.env.DB_USER || 'drawguess_admin',
  password: process.env.DB_PASSWORD || 'drawguess2024!',
  ssl: {
    rejectUnauthorized: false // AWS RDS SSL 연결
  },
  // 연결 풀 설정
  max: 5,  // 라즈베리파이에서는 적은 수의 연결
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

console.log('🔧 PostgreSQL 설정:', {
  host: pgConfig.host,
  port: pgConfig.port,
  database: pgConfig.database,
  user: pgConfig.user
});

const pgPool = new Pool(pgConfig);

// 데이터베이스 초기화 함수
async function initializeDatabase() {
  try {
    console.log('📊 PostgreSQL 데이터베이스 초기화 시작...');

    // 사용자 테이블 생성
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);

    // 게임 세션 테이블 생성
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(50) NOT NULL,
        players JSONB NOT NULL,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        winner_id INTEGER REFERENCES users(id),
        game_data JSONB
      );
    `);

    // 게임 점수 테이블 생성
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS game_scores (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES game_sessions(id),
        user_id INTEGER REFERENCES users(id),
        score INTEGER DEFAULT 0,
        round_number INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ PostgreSQL 데이터베이스 초기화 완료');
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error.message);
    return false;
  }
}

// Redis 연결 이벤트 처리
redisClient.on('error', (err) => {
  console.error('❌ Redis 연결 오류:', err.message);
});

redisClient.on('connect', () => {
  console.log('🔗 Redis 연결 시도 중...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis 연결 성공 및 준비 완료');
});

redisClient.on('end', () => {
  console.log('🔌 Redis 연결 종료');
});

// PostgreSQL 연결 이벤트 처리
pgPool.on('connect', (client) => {
  console.log('✅ PostgreSQL 새 연결 생성');
});

pgPool.on('error', (err, client) => {
  console.error('❌ PostgreSQL 연결 풀 오류:', err.message);
});

// 연결 상태 체크 함수들
async function checkRedisConnection() {
  try {
    if (!redisClient.isOpen) {
      return { status: 'disconnected', error: 'Client not connected' };
    }

    const result = await redisClient.ping();
    return { status: 'connected', ping: result };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

async function checkPostgreSQLConnection() {
  try {
    const result = await pgPool.query('SELECT NOW() as current_time, version() as version');
    return {
      status: 'connected',
      time: result.rows[0].current_time,
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
    };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

// 헬스체크 엔드포인트 (개선된 버전)
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '2.0.0',
    location: process.env.DEPLOYMENT_LOCATION || 'unknown',
    services: {},
    hybrid_cloud: {
      location: 'raspberry-pi-cluster',
      aws_connection: 'unknown',
      tailscale: 'checking'
    },
    config: {
      redis_host: process.env.REDIS_HOST,
      db_host: process.env.DB_HOST ? process.env.DB_HOST.split('.')[0] + '...' : 'not-set'
    }
  };

  // Redis 상태 확인
  const redisStatus = await checkRedisConnection();
  health.services.redis = redisStatus;
  if (redisStatus.status !== 'connected') {
    health.status = 'degraded';
  }

  // PostgreSQL 상태 확인
  const pgStatus = await checkPostgreSQLConnection();
  health.services.postgresql = pgStatus;
  if (pgStatus.status === 'connected') {
    health.hybrid_cloud.aws_connection = 'connected';
  } else {
    health.hybrid_cloud.aws_connection = 'disconnected';
    health.status = 'degraded';
  }

  // HTTP 상태 코드 설정
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// 디버그 엔드포인트 (환경변수 확인용)
app.get('/debug/env', (req, res) => {
  res.json({
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      hasPassword: !!process.env.REDIS_PASSWORD
    },
    postgres: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      hasPassword: !!process.env.DB_PASSWORD
    },
    other: {
      node_env: process.env.NODE_ENV,
      port: process.env.PORT,
      app_name: process.env.APP_NAME
    }
  });
});

// 간단한 Redis 테스트 엔드포인트
app.get('/test/redis', async (req, res) => {
  try {
    if (!redisClient.isOpen) {
      return res.status(503).json({ error: 'Redis client not connected' });
    }

    const testKey = 'test:' + Date.now();
    const testValue = 'Hello from hybrid cloud!';

    await redisClient.set(testKey, testValue, { EX: 60 }); // 60초 후 만료
    const retrieved = await redisClient.get(testKey);

    res.json({
      success: true,
      test_key: testKey,
      stored_value: testValue,
      retrieved_value: retrieved,
      match: testValue === retrieved
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 게임 관련 API 엔드포인트들 (기존과 동일)
app.get('/api/stats', async (req, res) => {
  try {
    let realtime = { active_rooms: 0, active_players: 0 };

    // Redis 연결되어 있다면 실시간 통계 조회
    if (redisClient.isOpen) {
      try {
        const activeRooms = await redisClient.get('active_rooms_count') || '0';
        const activePlayers = await redisClient.get('active_players_count') || '0';
        realtime = {
          active_rooms: parseInt(activeRooms),
          active_players: parseInt(activePlayers)
        };
      } catch (redisError) {
        console.warn('Redis 통계 조회 실패:', redisError.message);
      }
    }

    // PostgreSQL에서 전체 통계 조회
    const totalGames = await pgPool.query('SELECT COUNT(*) FROM game_sessions');
    const totalUsers = await pgPool.query('SELECT COUNT(*) FROM users');
    const topScores = await pgPool.query(`
      SELECT u.username, MAX(gs.score) as highest_score 
      FROM game_scores gs 
      JOIN users u ON gs.user_id = u.id 
      GROUP BY u.username 
      ORDER BY highest_score DESC 
      LIMIT 10
    `);

    res.json({
      realtime,
      historical: {
        total_games: parseInt(totalGames.rows[0].count),
        total_users: parseInt(totalUsers.rows[0].count),
        top_scores: topScores.rows
      },
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ error: '통계를 불러오는데 실패했습니다.' });
  }
});

// 사용자 등록/조회 API (기존과 동일)
app.post('/api/users', async (req, res) => {
  const { username, email } = req.body;

  try {
    const result = await pgPool.query(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
      [username, email]
    );

    res.status(201).json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: '이미 존재하는 사용자명입니다.' });
    } else {
      console.error('사용자 생성 오류:', error);
      res.status(500).json({ error: '사용자 생성에 실패했습니다.' });
    }
  }
});

// 서버 시작 함수
async function startServer() {
  try {
    console.log('🚀 DrawGuess 하이브리드 게임 서버 시작 중...');

    // Redis 연결 시도
    console.log('🔗 Redis 연결 중...');
    await redisClient.connect();

    // PostgreSQL 데이터베이스 초기화
    console.log('📊 PostgreSQL 초기화 중...');
    const dbInitialized = await initializeDatabase();

    // 서버 시작
    app.listen(port, '0.0.0.0', () => {
      console.log('\n🎉 서버 시작 완료!');
      console.log('========================================');
      console.log(`🎮 DrawGuess 하이브리드 게임 서버`);
      console.log(`📍 포트: ${port}`);
      console.log(`🥧 위치: 라즈베리파이 Kubernetes 클러스터`);
      console.log(`☁️ 데이터베이스: AWS RDS PostgreSQL (${dbInitialized ? '연결됨' : '오류'})`);
      console.log(`⚡ 캐시: Redis (${redisClient.isOpen ? '연결됨' : '오류'})`);
      console.log(`🔗 VPN: Tailscale 하이브리드 터널`);
      console.log(`🌐 헬스체크: http://localhost:${port}/health`);
      console.log(`🔍 디버그: http://localhost:${port}/debug/env`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error.message);

    // Redis 연결 실패시에도 서버는 시작 (PostgreSQL만으로도 동작 가능)
    if (error.message.includes('Redis')) {
      console.warn('⚠️ Redis 없이 서버 시작 (기능 제한됨)');
      app.listen(port, '0.0.0.0', () => {
        console.log(`🎮 제한된 모드로 서버 시작됨 (포트: ${port})`);
      });
    } else {
      process.exit(1);
    }
  }
}

// 그레이스풀 종료
process.on('SIGTERM', async () => {
  console.log('서버 종료 중...');
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
    await pgPool.end();
  } catch (error) {
    console.error('종료 중 오류:', error.message);
  }
  process.exit(0);
});

// 서버 시작
startServer();