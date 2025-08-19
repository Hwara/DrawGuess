// config/prometheus.js
// Prometheus 메트릭 설정 및 관련 함수들

const promClient = require('prom-client');

// Prometheus 레지스트리
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

// 메트릭 업데이트 함수
function updateGameMetrics(gameRooms, connectedUsers, io) {
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

// 의존성 상태 메트릭 업데이트
function updateDependencyMetrics(redisStatus, pgStatus) {
    gameMetrics.redisConnectionStatus.set(redisStatus.status === 'healthy' ? 1 : 0);
    if (redisStatus.responseTime) {
        gameMetrics.redisResponseTimeMs.set(redisStatus.responseTime);
    }

    gameMetrics.postgresqlConnectionStatus.set(pgStatus.status === 'healthy' ? 1 : 0);
    if (pgStatus.responseTime) {
        gameMetrics.postgresqlResponseTimeMs.set(pgStatus.responseTime);
    }
}

// HTTP 요청 시간 측정 미들웨어
function createHttpMetricsMiddleware() {
    return (req, res, next) => {
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
    };
}

// Prometheus 쿼리 클라이언트
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

// 유틸리티 함수들
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

module.exports = {
    register,
    gameMetrics,
    updateGameMetrics,
    updateDependencyMetrics,
    createHttpMetricsMiddleware,
    getAllMetricsFromPrometheus,
    formatBytes,
    formatUptime
};