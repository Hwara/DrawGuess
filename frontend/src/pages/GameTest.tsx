import React, { useState, useEffect } from 'react';

// 🔧 실제 API 응답 구조에 맞게 정확히 수정된 인터페이스
interface GameServerStatus {
    status: string;
    timestamp: string;
    environment: string;
    version: string;
    location: string;
    services: {
        redis: {
            status: string;
            ping: string;
        };
        postgresql: {
            status: string;
            time: string;
            version: string;
        };
        socketio: {
            status: string;
            connected_clients: number;
            active_rooms: number;
            total_players: number;
        };
    };
    hybrid_cloud: {
        location: string;
        aws_connection: string;
        tailscale: string;
    };
    config: {
        redis_host: string;
        db_host: string;
    };
}

// 🔧 API 응답에 맞게 수정된 인터페이스
interface ApiGameStats {
    realtime: {
        active_rooms: number;
        playing_rooms: number;
        active_players: number;
        socket_connections: number;
    };
    historical: {
        total_games: number;
        total_users: number;
        top_scores: any[];
    };
    last_updated: string;
}

// UI에서 사용할 가공된 데이터 인터페이스
interface GameStats {
    totalUsers: number;
    totalGames: number;
    activeConnections: number;
    activeRooms: number;
    activePlayers: number;
    performance?: {
        avgResponseTime: number;
        memoryUsage: number;
        cpuUsage: number;
    };
}

const GameTest: React.FC = () => {
    const [serverStatus, setServerStatus] = useState<GameServerStatus | null>(null);
    const [gameStats, setGameStats] = useState<GameStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // 🌐 게임 서버 URL - api.hwara-dev.kr로 고정
    const GAME_SERVER_URL = 'https://api.hwara-dev.kr';

    const fetchServerStatus = async () => {
        setIsLoading(true);
        setError(null);

        try {
            console.log(`🔗 서버 상태 확인: ${GAME_SERVER_URL}/health`);
            const response = await fetch(`${GAME_SERVER_URL}/health`);

            if (!response.ok) {
                throw new Error(`서버 응답 오류: ${response.status} ${response.statusText}`);
            }

            const data: GameServerStatus = await response.json();
            console.log('✅ 서버 상태 응답:', data);

            setServerStatus(data);
            setLastUpdate(new Date());
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '서버 연결 실패';
            console.error('❌ 서버 상태 확인 실패:', errorMessage);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchGameStats = async () => {
        try {
            console.log(`📊 게임 통계 확인: ${GAME_SERVER_URL}/api/stats`);
            const response = await fetch(`${GAME_SERVER_URL}/api/stats`);

            if (response.ok) {
                const apiData: ApiGameStats = await response.json();
                console.log('✅ 게임 통계 응답:', apiData);

                // 🔄 API 응답을 UI 형식으로 변환
                const transformedStats: GameStats = {
                    totalUsers: apiData.historical.total_users,
                    totalGames: apiData.historical.total_games,
                    activeConnections: apiData.realtime.socket_connections,
                    activeRooms: apiData.realtime.active_rooms,
                    activePlayers: apiData.realtime.active_players,
                    // performance 데이터는 현재 API에서 제공하지 않으므로 undefined
                };

                console.log('🔧 변환된 통계:', transformedStats);
                setGameStats(transformedStats);
            } else {
                console.warn(`⚠️ 게임 통계 로드 실패: ${response.status}`);
            }
        } catch (err) {
            console.warn('⚠️ 게임 통계 로드 실패:', err);
        }
    };

    const showRedisInfo = () => {
        if (!serverStatus) {
            alert('서버 상태를 먼저 확인해주세요.');
            return;
        }

        const redisInfo = serverStatus.services.redis;
        alert(`Redis 연결 정보:\n` +
            `상태: ${redisInfo.status}\n` +
            `Ping: ${redisInfo.ping}\n` +
            `호스트: ${serverStatus.config.redis_host}`);
    };

    const showDatabaseInfo = () => {
        if (!serverStatus) {
            alert('서버 상태를 먼저 확인해주세요.');
            return;
        }

        const dbInfo = serverStatus.services.postgresql;
        alert(`PostgreSQL 연결 정보:\n` +
            `상태: ${dbInfo.status}\n` +
            `버전: ${dbInfo.version}\n` +
            `연결 시간: ${new Date(dbInfo.time).toLocaleString('ko-KR')}\n` +
            `호스트: ${serverStatus.config.db_host}`);
    };

    const showHybridCloudInfo = () => {
        if (!serverStatus) {
            alert('서버 상태를 먼저 확인해주세요.');
            return;
        }

        const hybridInfo = serverStatus.hybrid_cloud;
        alert(`하이브리드 클라우드 정보:\n` +
            `위치: ${hybridInfo.location}\n` +
            `AWS 연결: ${hybridInfo.aws_connection}\n` +
            `Tailscale VPN: ${hybridInfo.tailscale}\n` +
            `서버 위치: ${serverStatus.location}`);
    };

    useEffect(() => {
        console.log(`🚀 GameTest 초기화 - 서버: ${GAME_SERVER_URL}`);
        fetchServerStatus();
        fetchGameStats();

        // 자동 새로고침 (30초마다)
        const interval = setInterval(() => {
            console.log('⏰ 자동 새로고침 실행');
            fetchServerStatus();
            fetchGameStats();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string | undefined | null) => {
        const statusStr = String(status || '').toLowerCase();

        switch (statusStr) {
            case 'healthy':
            case 'connected':
            case 'ok':
            case 'active':
                return '#4ade80'; // green
            case 'warning':
                return '#fbbf24'; // yellow
            case 'error':
            case 'disconnected':
            case 'inactive':
                return '#f87171'; // red
            default:
                return '#94a3b8'; // gray
        }
    };

    return (
        <div className="game-test">
            <div className="container">
                {/* 헤더 */}
                <div className="test-header">
                    <h1>🎮 게임 서버 테스트</h1>
                    <div className="server-info">
                        <span className="server-url">서버: {GAME_SERVER_URL}</span>
                        <div className="last-update">
                            <span className="pulse-dot"></span>
                            마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
                        </div>
                    </div>
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div className="error-banner">
                        <span>⚠️ {error}</span>
                        <button onClick={fetchServerStatus} disabled={isLoading}>
                            다시 시도
                        </button>
                    </div>
                )}

                {/* 서버 상태 */}
                <section className="server-status-section">
                    <h2>📊 서버 상태</h2>
                    {serverStatus ? (
                        <div className="status-grid">
                            <div className="status-card">
                                <div className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(serverStatus.status) }}>
                                </div>
                                <div className="status-content">
                                    <h3>전체 상태</h3>
                                    <p>{serverStatus.status}</p>
                                    <small>v{serverStatus.version} | {serverStatus.environment}</small>
                                </div>
                            </div>

                            <div className="status-card">
                                <div className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(serverStatus.services.redis.status) }}>
                                </div>
                                <div className="status-content">
                                    <h3>Redis Cache</h3>
                                    <p>{serverStatus.services.redis.status}</p>
                                    <small>{serverStatus.services.redis.ping} | {serverStatus.config.redis_host}</small>
                                </div>
                            </div>

                            <div className="status-card">
                                <div className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(serverStatus.services.postgresql.status) }}>
                                </div>
                                <div className="status-content">
                                    <h3>PostgreSQL DB</h3>
                                    <p>{serverStatus.services.postgresql.status}</p>
                                    <small>{serverStatus.services.postgresql.version} | AWS RDS</small>
                                </div>
                            </div>

                            <div className="status-card">
                                <div className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(serverStatus.services.socketio.status) }}>
                                </div>
                                <div className="status-content">
                                    <h3>Socket.IO 서비스</h3>
                                    <p>{serverStatus.services.socketio.status}</p>
                                    <small>{serverStatus.services.socketio.connected_clients}명 연결 | {serverStatus.services.socketio.active_rooms}개 방</small>
                                </div>
                            </div>

                            <div className="status-card">
                                <div className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(serverStatus.hybrid_cloud.aws_connection) }}>
                                </div>
                                <div className="status-content">
                                    <h3>하이브리드 클라우드</h3>
                                    <p>{serverStatus.hybrid_cloud.aws_connection}</p>
                                    <small>Tailscale: {serverStatus.hybrid_cloud.tailscale} | {serverStatus.location}</small>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="loading-placeholder">
                            {isLoading ? '서버 상태 확인 중...' : '서버 상태를 불러올 수 없습니다.'}
                        </div>
                    )}
                </section>

                {/* 게임 통계 */}
                {gameStats ? (
                    <section className="game-stats-section">
                        <h2>📈 게임 통계</h2>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon">👥</div>
                                <div className="stat-content">
                                    <div className="stat-value">{gameStats.totalUsers}</div>
                                    <div className="stat-label">총 사용자</div>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">🎮</div>
                                <div className="stat-content">
                                    <div className="stat-value">{gameStats.totalGames}</div>
                                    <div className="stat-label">총 게임 수</div>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">🔗</div>
                                <div className="stat-content">
                                    <div className="stat-value">{gameStats.activeConnections}</div>
                                    <div className="stat-label">Socket 연결</div>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">🏠</div>
                                <div className="stat-content">
                                    <div className="stat-value">{gameStats.activeRooms}</div>
                                    <div className="stat-label">활성 게임방</div>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon">👨‍💻</div>
                                <div className="stat-content">
                                    <div className="stat-value">{gameStats.activePlayers}</div>
                                    <div className="stat-label">현재 플레이어</div>
                                </div>
                            </div>

                            {gameStats.performance && (
                                <div className="stat-card">
                                    <div className="stat-icon">⚡</div>
                                    <div className="stat-content">
                                        <div className="stat-value">{gameStats.performance.avgResponseTime}ms</div>
                                        <div className="stat-label">평균 응답시간</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                ) : (
                    <section className="game-stats-section">
                        <h2>📈 게임 통계</h2>
                        <div className="loading-placeholder">
                            게임 통계를 불러오는 중...
                        </div>
                    </section>
                )}

                {/* 테스트 버튼들 */}
                <section className="test-controls">
                    <h2>🧪 연결 테스트</h2>
                    <div className="test-buttons">
                        <button
                            className="test-btn primary"
                            onClick={fetchServerStatus}
                            disabled={isLoading}
                        >
                            {isLoading ? '확인 중...' : '🔄 서버 상태 새로고침'}
                        </button>

                        <button
                            className="test-btn secondary"
                            onClick={showRedisInfo}
                            disabled={!serverStatus}
                        >
                            🗄️ Redis 연결 정보
                        </button>

                        <button
                            className="test-btn secondary"
                            onClick={showDatabaseInfo}
                            disabled={!serverStatus}
                        >
                            💾 PostgreSQL 연결 정보
                        </button>

                        <button
                            className="test-btn secondary"
                            onClick={showHybridCloudInfo}
                            disabled={!serverStatus}
                        >
                            🔗 하이브리드 클라우드 정보
                        </button>

                        <a
                            href={`${GAME_SERVER_URL}/health`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="test-btn info"
                        >
                            🔍 Health 엔드포인트 보기
                        </a>

                        <a
                            href={`${GAME_SERVER_URL}/api/stats`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="test-btn info"
                        >
                            📊 Stats 엔드포인트 보기
                        </a>
                    </div>
                </section>

                {/* 하이브리드 아키텍처 정보 */}
                <section className="architecture-info">
                    <h2>🏗️ 하이브리드 아키텍처</h2>
                    <div className="architecture-diagram">
                        <div className="arch-component local">
                            <h3>🥧 라즈베리파이 클러스터</h3>
                            <ul>
                                <li>• Node.js 게임 서버 (실시간 로직)</li>
                                <li>• Redis 캐시 (임시 데이터)</li>
                                <li>• Kubernetes 오케스트레이션</li>
                                <li>• MetalLB 로드밸런서</li>
                            </ul>
                        </div>

                        <div className="arch-arrow">
                            <span>🔗</span>
                            <small>Tailscale VPN</small>
                        </div>

                        <div className="arch-component cloud">
                            <h3>☁️ AWS 클라우드</h3>
                            <ul>
                                <li>• PostgreSQL RDS (영구 데이터)</li>
                                <li>• S3 (정적 자산 저장)</li>
                                <li>• CloudWatch (모니터링)</li>
                            </ul>
                        </div>

                        <div className="arch-arrow">
                            <span>🌐</span>
                            <small>웹 트래픽</small>
                        </div>

                        <div className="arch-component" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white' }}>
                            <h3>🌐 Cloudflare</h3>
                            <ul>
                                <li>• DNS 관리 (hwara-dev.kr)</li>
                                <li>• CDN & 캐싱</li>
                                <li>• DDoS 보호</li>
                                <li>• SSL/TLS 인증서</li>
                            </ul>
                        </div>
                    </div>

                    <div className="data-flow">
                        <h4>📊 데이터 흐름</h4>
                        <div className="flow-items">
                            <div className="flow-item">
                                <span className="flow-icon">⚡</span>
                                <div className="flow-content">
                                    <strong>실시간 데이터</strong>
                                    <p>게임 세션, 채팅 → Redis (라즈베리파이)</p>
                                </div>
                            </div>
                            <div className="flow-item">
                                <span className="flow-icon">💾</span>
                                <div className="flow-content">
                                    <strong>영구 데이터</strong>
                                    <p>사용자 정보, 게임 기록 → PostgreSQL (AWS)</p>
                                </div>
                            </div>
                            <div className="flow-item">
                                <span className="flow-icon">🌍</span>
                                <div className="flow-content">
                                    <strong>글로벌 배포</strong>
                                    <p>웹사이트, 이미지 → Cloudflare CDN</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="benefits">
                        <h4>💰 하이브리드 클라우드 이점</h4>
                        <ul>
                            <li>• <strong>70% 비용 절감</strong>: 컴퓨팅은 로컬, 관리형 서비스는 클라우드</li>
                            <li>• <strong>낮은 지연시간</strong>: 실시간 게임 로직을 물리적으로 가까운 곳에서 처리</li>
                            <li>• <strong>높은 안정성</strong>: AWS 관리형 서비스로 데이터 백업 및 복구</li>
                            <li>• <strong>글로벌 CDN</strong>: Cloudflare를 통한 전 세계 빠른 콘텐츠 배포</li>
                            <li>• <strong>통합 DNS/CDN</strong>: Cloudflare 하나로 DNS + CDN + 보안 통합 관리</li>
                            <li>• <strong>확장 가능성</strong>: Kubernetes 기반 수평 확장</li>
                        </ul>
                    </div>
                </section>

                {/* 기술 스택 정보 */}
                <section className="tech-stack">
                    <h2>🛠️ 기술 스택</h2>
                    <div className="tech-categories">
                        <div className="tech-category">
                            <h3>Frontend</h3>
                            <div className="tech-tags">
                                <span>React</span>
                                <span>TypeScript</span>
                                <span>Socket.IO Client</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <h3>Backend (라즈베리파이)</h3>
                            <div className="tech-tags">
                                <span>Node.js</span>
                                <span>Express</span>
                                <span>Socket.IO</span>
                                <span>Redis</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <h3>Infrastructure</h3>
                            <div className="tech-tags">
                                <span>Kubernetes</span>
                                <span>MetalLB</span>
                                <span>Prometheus</span>
                                <span>Grafana</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <h3>AWS 클라우드</h3>
                            <div className="tech-tags">
                                <span>RDS PostgreSQL</span>
                                <span>S3</span>
                                <span>CloudWatch</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <h3>Cloudflare</h3>
                            <div className="tech-tags">
                                <span>DNS</span>
                                <span>CDN</span>
                                <span>DDoS Protection</span>
                                <span>SSL/TLS</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <h3>VPN & 연결</h3>
                            <div className="tech-tags">
                                <span>Tailscale VPN</span>
                                <span>WireGuard</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 디버깅 정보 */}
                <section className="debug-info">
                    <h2>🔍 디버깅 정보</h2>
                    <div className="debug-details">
                        <div className="debug-item">
                            <strong>현재 환경:</strong> {process.env.NODE_ENV || 'development'}
                        </div>
                        <div className="debug-item">
                            <strong>게임 서버 URL:</strong> {GAME_SERVER_URL}
                        </div>
                        <div className="debug-item">
                            <strong>브라우저 User Agent:</strong> {navigator.userAgent}
                        </div>
                        <div className="debug-item">
                            <strong>현재 시간:</strong> {new Date().toISOString()}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default GameTest;