// config/database.js
// Redis 및 PostgreSQL 연결 설정

const { createClient } = require('redis');
const { Pool } = require('pg');

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

// Redis 연결 초기화
async function initializeRedis() {
    try {
        await redisClient.connect();
        await redisPub.connect();
        await redisSub.connect();

        console.log('✅ Redis 클라이언트 연결 성공');

        // Redis Pub/Sub으로 다중 포드 간 통신 설정
        redisSub.subscribe('game:events', (message) => {
            const event = JSON.parse(message);
            // 이 부분은 server.js에서 io 객체를 받아서 처리
        });

    } catch (error) {
        console.error('❌ Redis 연결 실패:', error);
    }
}

// PostgreSQL 연결 확인
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

// 의존성 상태 확인 함수들
async function checkRedisConnection() {
    try {
        const start = Date.now();
        await redisClient.ping();
        const responseTime = Date.now() - start;

        return { status: 'healthy', responseTime };
    } catch (error) {
        return { status: 'unhealthy', error: error.message };
    }
}

async function checkPostgreSQLConnection() {
    try {
        const start = Date.now();
        const result = await pgPool.query('SELECT 1 as health');
        const responseTime = Date.now() - start;

        return { status: 'healthy', responseTime };
    } catch (error) {
        return { status: 'unhealthy', error: error.message };
    }
}

module.exports = {
    redisClient,
    redisPub,
    redisSub,
    pgPool,
    initializeRedis,
    initializePostgreSQL,
    checkRedisConnection,
    checkPostgreSQLConnection
};