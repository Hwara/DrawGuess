import React, { useState, useEffect } from 'react';
import './GameTest.css';

interface GameServerStatus {
    status: string;
    timestamp: string;
    services: {
        redis: string;
        database: string;
        api: string;
    };
    environment: string;
    version: string;
    uptime: string;
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

            const data = await response.json();
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

                setGameStats(transformedStats);
            } else {
                console.warn(`⚠️ 게임 통계 로드 실패: ${response.status}`);
            }
        } catch (err) {
            console.warn('⚠️ 게임 통계 로드 실패:', err);
        }
    };

    const testRedisConnection = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${GAME_SERVER_URL}/test/redis`);
            const result = await response.json();
            alert(`Redis 테스트: ${result.success ? '성공' : '실패'}\n${result.message}`);
        } catch (err) {
            alert('Redis 테스트 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
        } finally {
            setIsLoading(false);
        }
    };

    const testDatabaseConnection = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${GAME_SERVER_URL}/test/database`);
            const result = await response.json();
            alert(`PostgreSQL 테스트: ${result.success ? '성공' : '실패'}\n${result.message}`);
        } catch (err) {
            alert('데이터베이스 테스트 실패: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        console.log(`🚀 GameTest 초기화 - 서버: ${GAME_SERVER_URL}`);
        fetchServerStatus();
        fetchGameStats();

        // 자동 새로고침 (30초마다)
        const interval = setInterval(() => {
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
                return '#4ade80'; // green
            case 'warning':
                return '#fbbf24'; // yellow
            case 'error':
            case 'disconnected':
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
                                    <p>{serverStatus.status || 'Unknown'}</p>
                                    <small>v{serverStatus.version} | {serverStatus.environment}</small>
                                </div>
                            </div>

                            <div className="status-card">
                                <div className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(serverStatus.services?.redis) }}>
                                </div>
                                <div className="status-content">
                                    <h3>Redis Cache</h3>
                                    <p>{serverStatus.services?.redis || 'Unknown'}</p>
                                    <small>라즈베리파이 로컬 캐시</small>
                                </div>
                            </div>

                            <div className="status-card">
                                <div className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(serverStatus.services?.database) }}>
                                </div>
                                <div className="status-content">
                                    <h3>PostgreSQL DB</h3>
                                    <p>{serverStatus.services?.database || 'Unknown'}</p>
                                    <small>AWS RDS (하이브리드)</small>
                                </div>
                            </div>

                            <div className="status-card">
                                <div className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(serverStatus.services?.api) }}>
                                </div>
                                <div className="status-content">
                                    <h3>API 서비스</h3>
                                    <p>{serverStatus.services?.api || 'Unknown'}</p>
                                    <small>Node.js + Express</small>
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
                {gameStats && (
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
                            onClick={testRedisConnection}
                            disabled={isLoading}
                        >
                            🗄️ Redis 연결 테스트
                        </button>

                        <button
                            className="test-btn secondary"
                            onClick={testDatabaseConnection}
                            disabled={isLoading}
                        >
                            💾 PostgreSQL 연결 테스트
                        </button>

                        <a
                            href={`${GAME_SERVER_URL}/debug/env`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="test-btn info"
                        >
                            🔍 환경 변수 디버깅
                        </a>

                        <a
                            href={`${GAME_SERVER_URL}/api/stats`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="test-btn info"
                        >
                            📊 Raw API 응답 보기
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

                        <div className="arch-arrow">🔗 Tailscale VPN</div>

                        <div className="arch-component cloud">
                            <h3>☁️ AWS 클라우드</h3>
                            <ul>
                                <li>• PostgreSQL RDS (영구 데이터)</li>
                                <li>• S3 + CloudFront (정적 자산)</li>
                                <li>• Route 53 (DNS)</li>
                                <li>• CloudWatch (모니터링)</li>
                            </ul>
                        </div>
                    </div>

                    <div className="benefits">
                        <h4>💰 하이브리드 클라우드 이점</h4>
                        <ul>
                            <li>• <strong>70% 비용 절감</strong>: 컴퓨팅은 로컬, 관리형 서비스는 클라우드</li>
                            <li>• <strong>낮은 지연시간</strong>: 실시간 게임 로직을 물리적으로 가까운 곳에서 처리</li>
                            <li>• <strong>높은 안정성</strong>: AWS 관리형 서비스로 데이터 백업 및 복구</li>
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
                            <h3>Cloud (AWS)</h3>
                            <div className="tech-tags">
                                <span>RDS PostgreSQL</span>
                                <span>S3</span>
                                <span>CloudFront</span>
                                <span>Tailscale VPN</span>
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