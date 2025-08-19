// routes/apiRoutes.js
// 모든 REST API 라우트

const express = require('express');
const {
    register,
    getAllMetricsFromPrometheus,
    formatBytes,
    formatUptime
} = require('../config/prometheus');
const {
    checkRedisConnection,
    checkPostgreSQLConnection
} = require('../config/database');
const { getDrawingHistoryFromRedis } = require('../services/gameService');
const StatisticsService = require('../services/statisticsService');

const router = express.Router();

// 1. Prometheus 메트릭 엔드포인트 (명세서 기준)
router.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        console.error('메트릭 수집 오류:', error);
        res.status(500).send('# Metrics collection failed\n# Error: ' + error.message);
    }
});

// 2. 통합 상태 API (명세서 기준) - 핵심!
router.get('/api/status', async (req, res) => {
    const startTime = Date.now();

    try {
        // Prometheus에서 모든 메트릭 조회
        const allMetrics = await getAllMetricsFromPrometheus();

        // 직접 수집한 메트릭 (Prometheus가 안 될 때 대비)
        const directMetrics = {
            gameRooms: req.app.get('gameRooms')?.size || 0,
            players: req.app.get('connectedUsers')?.size || 0,
            socketConnections: req.app.get('io')?.engine?.clientsCount || 0,
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
                    rxRate: 'N/A',
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
                    activeConnections: req.app.get('activeHttpConnections') || 0,
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
                    change5m: 'N/A',
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
                    activeRooms: req.app.get('gameRooms')?.size || 0,
                    activePlayers: req.app.get('connectedUsers')?.size || 0,
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
router.get('/health', async (req, res) => {
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

// === 순위표 및 통계 API들 (신규) ===

// 리더보드 조회 API
router.get('/api/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const result = await StatisticsService.getLeaderboard(limit);

        if (result.success) {
            res.json({
                success: true,
                leaderboard: result.data,
                metadata: result.metadata
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error,
                leaderboard: []
            });
        }
    } catch (error) {
        console.error('리더보드 API 오류:', error);
        res.status(500).json({
            success: false,
            error: '리더보드 조회 중 오류가 발생했습니다',
            leaderboard: []
        });
    }
});

// 특정 사용자 상세 통계 조회 API
router.get('/api/user/:username/stats', async (req, res) => {
    try {
        const { username } = req.params;
        const result = await StatisticsService.getUserDetailedStats(username);

        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json({
                success: false,
                error: result.error || '사용자를 찾을 수 없습니다'
            });
        }
    } catch (error) {
        console.error('사용자 통계 API 오류:', error);
        res.status(500).json({
            success: false,
            error: '사용자 통계 조회 중 오류가 발생했습니다'
        });
    }
});

// 전체 게임 통계 조회 API
router.get('/api/stats/overview', async (req, res) => {
    try {
        const result = await StatisticsService.getOverallStatistics();
        res.json(result);
    } catch (error) {
        console.error('전체 통계 API 오류:', error);
        res.status(500).json({
            success: false,
            error: '전체 통계 조회 중 오류가 발생했습니다',
            data: {
                totalUsers: 0,
                totalGames: 0,
                avgPlayersPerGame: 0,
                highestScore: 0,
                avgGameDuration: 0
            }
        });
    }
});

// 최근 게임 활동 조회 API
router.get('/api/recent-activity', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const result = await StatisticsService.getRecentActivity(limit);

        res.json(result);
    } catch (error) {
        console.error('최근 활동 API 오류:', error);
        res.status(500).json({
            success: false,
            error: '최근 활동 조회 중 오류가 발생했습니다',
            data: []
        });
    }
});

// === 개발 중 디버깅용 API들 ===

// 특정 방의 그림 히스토리 확인
router.get('/api/debug/drawing/:roomId', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).send('Not found');
    }

    try {
        const { roomId } = req.params;
        const history = await getDrawingHistoryFromRedis(roomId);
        const gameRooms = req.app.get('gameRooms');
        const room = gameRooms?.get(roomId);

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

// 특정 방의 점수 현황 확인
router.get('/api/debug/scores/:roomId', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).send('Not found');
    }

    try {
        const { roomId } = req.params;
        const gameRooms = req.app.get('gameRooms');
        const room = gameRooms?.get(roomId);

        if (!room) {
            return res.status(404).json({ error: '방을 찾을 수 없습니다' });
        }

        res.json({
            roomId,
            status: room.status,
            currentRound: room.currentRound,
            playersFromMap: Array.from(room.players.values()).map(p => ({
                id: p.id,
                username: p.username,
                score: p.score
            })),
            scoresFromMap: Object.fromEntries(room.scores),
            gameStateResult: room.getGameState().players.map(p => ({
                id: p.id,
                username: p.username,
                score: p.score
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 테스트용 그리기 포인트 생성
router.post('/api/debug/test-drawing/:roomId', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).send('Not found');
    }

    try {
        const { roomId } = req.params;
        const gameRooms = req.app.get('gameRooms');
        const room = gameRooms?.get(roomId);

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
        const { saveDrawingToRedis } = require('../services/gameService');
        await saveDrawingToRedis(roomId, testDrawingPoint);

        // 방의 모든 사용자에게 브로드캐스트
        const io = req.app.get('io');
        io.to(roomId).emit('drawing', testDrawingPoint);

        res.json({
            message: '테스트 그리기 포인트 생성됨',
            drawingPoint: testDrawingPoint
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;