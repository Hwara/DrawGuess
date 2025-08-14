import React, { useState, useEffect } from 'react';

// API 엔드포인트 설정
const API_BASE_URL = 'https://api.hwara-dev.kr';

// API 명세서에 따른 타입 정의
interface StatusResponse {
    timestamp: string;
    service: string;
    version: string;
    environment: string;
    responseTime: number;
    overall: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        score: number;
        issues: string[];
    };
    system: {
        memory: {
            total: string;
            available: string;
            usage: string;
            status: 'excellent' | 'normal' | 'warning' | 'critical';
        };
        cpu: {
            usage: string;
            loadAverage: string;
            cores: number;
            status: 'excellent' | 'normal' | 'warning' | 'critical';
        };
        disk: {
            usage: string;
            available: string;
            status: 'excellent' | 'normal' | 'warning' | 'critical';
        };
        network: {
            rxRate: string;
            txRate: string;
            status: 'excellent' | 'normal' | 'warning' | 'critical';
        };
    };
    application: {
        uptime: {
            seconds: number;
            human: string;
        };
        performance: {
            httpRequests: number;
            avgResponseTime: string;
            activeConnections: number;
            status: 'excellent' | 'normal' | 'warning' | 'critical';
        };
        gameMetrics: {
            activeRooms: number;
            activePlayers: number;
            socketConnections: number;
            avgPlayersPerRoom: number;
            status: 'active' | 'normal' | 'warning' | 'inactive';
        };
        runtime: {
            nodejs: {
                version: string;
                heapUsed: string;
                heapTotal: string;
                heapUsage: string;
                external: string;
                rss: string;
            };
            memory: {
                status: 'excellent' | 'normal' | 'warning' | 'critical';
            };
        };
        dependencies: {
            redis: {
                status: 'healthy' | 'unhealthy';
                responseTime: string;
                lastCheck: string;
                error?: string;
            };
            postgresql: {
                status: 'healthy' | 'unhealthy';
                responseTime: string;
                lastCheck: string;
                error?: string;
            };
        };
    };
    trends: {
        gameRooms: {
            current: number;
            change5m: string;
            trend: 'increasing' | 'decreasing' | 'stable';
        };
        players: {
            current: number;
            change5m: string;
            trend: 'increasing' | 'decreasing' | 'stable';
        };
        responseTime: {
            current: number;
            change5m: string;
            trend: 'improving' | 'degrading' | 'stable';
        };
        memoryUsage: {
            current: number;
            change5m: string;
            trend: 'increasing' | 'decreasing' | 'stable';
        };
    };
    prometheus: {
        connected: boolean;
        lastScrape: string;
        metricsCount: number;
        queryTime: string;
        issues?: string[];
    };
}

const ServerStatus: React.FC = () => {
    const [data, setData] = useState<StatusResponse | null>(null);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // API 데이터 가져오기
    const fetchServerStatus = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/api/status`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`API 응답 오류: ${response.status} ${response.statusText}`);
            }

            const statusData: StatusResponse = await response.json();
            setData(statusData);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('API 호출 실패:', err);
            setError(err instanceof Error ? err.message : 'API 호출 실패');
        } finally {
            setLoading(false);
        }
    };

    // 컴포넌트 마운트 시 데이터 로드 및 주기적 업데이트
    useEffect(() => {
        fetchServerStatus();

        const interval = setInterval(() => {
            fetchServerStatus();
        }, 30000); // 30초마다 업데이트

        return () => clearInterval(interval);
    }, []);

    // 상태에 따른 색상 반환
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'excellent':
            case 'active':
                return '#4ade80'; // green
            case 'normal':
                return '#3b82f6'; // blue
            case 'warning':
            case 'degraded':
                return '#fbbf24'; // yellow
            case 'critical':
            case 'unhealthy':
            case 'inactive':
                return '#f87171'; // red
            default:
                return '#94a3b8'; // gray
        }
    };

    // 사용률에 따른 색상 반환
    const getUsageColor = (usage: number) => {
        if (usage < 50) return '#4ade80';
        if (usage < 75) return '#fbbf24';
        return '#f87171';
    };

    // 트렌드 아이콘 반환
    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'increasing':
                return '📈';
            case 'decreasing':
                return '📉';
            case 'improving':
                return '⬆️';
            case 'degrading':
                return '⬇️';
            case 'stable':
            default:
                return '➡️';
        }
    };

    // 사용률 파싱 (문자열에서 숫자 추출)
    const parseUsage = (usageStr: string): number => {
        const match = usageStr.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : 0;
    };

    if (loading && !data) {
        return (
            <div className="server-status">
                <div className="container">
                    <div className="status-header">
                        <h1>📊 실시간 서버 상태</h1>
                        <div className="last-update">
                            <span className="pulse-dot loading"></span>
                            데이터 로딩 중...
                        </div>
                    </div>
                    <div className="loading-message">서버 상태를 불러오는 중입니다...</div>
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="server-status">
                <div className="container">
                    <div className="status-header">
                        <h1>📊 실시간 서버 상태</h1>
                        <div className="error-message">
                            ⚠️ {error}
                            <button onClick={fetchServerStatus} className="retry-button">다시 시도</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="server-status">
            <div className="container">
                <div className="status-header">
                    <h1>📊 실시간 서버 상태</h1>
                    <div className="last-update">
                        <span className={loading ? "pulse-dot loading" : "pulse-dot"}></span>
                        {loading ? '업데이트 중...' : `마지막 업데이트: ${lastUpdate.toLocaleTimeString('ko-KR')}`}
                        {error && <div className="error-message">⚠️ {error}</div>}
                    </div>
                </div>

                {/* 전체 상태 개요 */}
                <section className="overall-status">
                    <div className="status-card overall">
                        <div className="status-header-card">
                            <h2>🎮 {data.service}</h2>
                            <div
                                className="status-badge"
                                style={{ backgroundColor: getStatusColor(data.overall.status) }}
                            >
                                {data.overall.status.toUpperCase()}
                            </div>
                        </div>
                        <div className="status-details">
                            <div className="detail-item">
                                <span>버전: {data.version}</span>
                            </div>
                            <div className="detail-item">
                                <span>환경: {data.environment}</span>
                            </div>
                            <div className="detail-item">
                                <span>응답시간: {data.responseTime}ms</span>
                            </div>
                            <div className="detail-item">
                                <span>상태 점수: {data.overall.score}/100</span>
                            </div>
                        </div>
                        {data.overall.issues.length > 0 && (
                            <div className="issues">
                                <h4>⚠️ 알려진 문제:</h4>
                                <ul>
                                    {data.overall.issues.map((issue, index) => (
                                        <li key={index}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>

                {/* 시스템 메트릭 */}
                <section className="system-metrics">
                    <h2>🖥️ 시스템 메트릭</h2>
                    <div className="metrics-grid">
                        <div className="metric-card">
                            <div className="metric-header">
                                <h3>💾 메모리</h3>
                                <div
                                    className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(data.system.memory.status) }}
                                ></div>
                            </div>
                            <div className="metric-content">
                                <div className="metric-bar">
                                    <div
                                        className="metric-fill"
                                        style={{
                                            width: data.system.memory.usage,
                                            backgroundColor: getUsageColor(parseUsage(data.system.memory.usage))
                                        }}
                                    ></div>
                                </div>
                                <div className="metric-details">
                                    <span>사용률: {data.system.memory.usage}</span>
                                    <span>사용 가능: {data.system.memory.available}</span>
                                    <span>총 용량: {data.system.memory.total}</span>
                                </div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-header">
                                <h3>⚡ CPU</h3>
                                <div
                                    className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(data.system.cpu.status) }}
                                ></div>
                            </div>
                            <div className="metric-content">
                                <div className="metric-bar">
                                    <div
                                        className="metric-fill"
                                        style={{
                                            width: data.system.cpu.usage,
                                            backgroundColor: getUsageColor(parseUsage(data.system.cpu.usage))
                                        }}
                                    ></div>
                                </div>
                                <div className="metric-details">
                                    <span>사용률: {data.system.cpu.usage}</span>
                                    <span>Load Average: {data.system.cpu.loadAverage}</span>
                                    <span>코어: {data.system.cpu.cores}개</span>
                                </div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-header">
                                <h3>💿 디스크</h3>
                                <div
                                    className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(data.system.disk.status) }}
                                ></div>
                            </div>
                            <div className="metric-content">
                                <div className="metric-bar">
                                    <div
                                        className="metric-fill"
                                        style={{
                                            width: data.system.disk.usage,
                                            backgroundColor: getUsageColor(parseUsage(data.system.disk.usage))
                                        }}
                                    ></div>
                                </div>
                                <div className="metric-details">
                                    <span>사용률: {data.system.disk.usage}</span>
                                    <span>사용 가능: {data.system.disk.available}</span>
                                </div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-header">
                                <h3>🌐 네트워크</h3>
                                <div
                                    className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(data.system.network.status) }}
                                ></div>
                            </div>
                            <div className="metric-content">
                                <div className="metric-details">
                                    <span>수신: {data.system.network.rxRate}</span>
                                    <span>송신: {data.system.network.txRate}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 애플리케이션 메트릭 */}
                <section className="application-metrics">
                    <h2>🎮 애플리케이션 메트릭</h2>

                    {/* 게임 메트릭 */}
                    <div className="app-section">
                        <h3>게임 현황</h3>
                        <div className="overview-grid">
                            <div className="overview-card">
                                <div className="card-icon">🎪</div>
                                <div className="card-content">
                                    <div className="card-value">
                                        {data.application.gameMetrics.activeRooms}
                                        <span className="trend">
                                            {getTrendIcon(data.trends.gameRooms.trend)} {data.trends.gameRooms.change5m}
                                        </span>
                                    </div>
                                    <div className="card-label">활성 게임방</div>
                                </div>
                            </div>

                            <div className="overview-card">
                                <div className="card-icon">👥</div>
                                <div className="card-content">
                                    <div className="card-value">
                                        {data.application.gameMetrics.activePlayers}
                                        <span className="trend">
                                            {getTrendIcon(data.trends.players.trend)} {data.trends.players.change5m}
                                        </span>
                                    </div>
                                    <div className="card-label">활성 플레이어</div>
                                </div>
                            </div>

                            <div className="overview-card">
                                <div className="card-icon">🔌</div>
                                <div className="card-content">
                                    <div className="card-value">{data.application.gameMetrics.socketConnections}</div>
                                    <div className="card-label">Socket 연결</div>
                                </div>
                            </div>

                            <div className="overview-card">
                                <div className="card-icon">📊</div>
                                <div className="card-content">
                                    <div className="card-value">{data.application.gameMetrics.avgPlayersPerRoom.toFixed(1)}</div>
                                    <div className="card-label">방당 평균 인원</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 성능 메트릭 */}
                    <div className="app-section">
                        <h3>성능 지표</h3>
                        <div className="performance-grid">
                            <div className="perf-item">
                                <span className="perf-label">가동시간</span>
                                <span className="perf-value">{data.application.uptime.human}</span>
                            </div>
                            <div className="perf-item">
                                <span className="perf-label">HTTP 요청 수</span>
                                <span className="perf-value">{data.application.performance.httpRequests.toLocaleString()}</span>
                            </div>
                            <div className="perf-item">
                                <span className="perf-label">평균 응답시간</span>
                                <span className="perf-value">
                                    {data.application.performance.avgResponseTime}
                                    <span className="trend">
                                        {getTrendIcon(data.trends.responseTime.trend)} {data.trends.responseTime.change5m}ms
                                    </span>
                                </span>
                            </div>
                            <div className="perf-item">
                                <span className="perf-label">활성 연결</span>
                                <span className="perf-value">{data.application.performance.activeConnections}</span>
                            </div>
                        </div>
                    </div>

                    {/* 런타임 정보 */}
                    <div className="app-section">
                        <h3>런타임 정보</h3>
                        <div className="runtime-grid">
                            <div className="runtime-item">
                                <span>Node.js 버전: {data.application.runtime.nodejs.version}</span>
                            </div>
                            <div className="runtime-item">
                                <span>힙 메모리: {data.application.runtime.nodejs.heapUsed} / {data.application.runtime.nodejs.heapTotal} ({data.application.runtime.nodejs.heapUsage})</span>
                            </div>
                            <div className="runtime-item">
                                <span>외부 메모리: {data.application.runtime.nodejs.external}</span>
                            </div>
                            <div className="runtime-item">
                                <span>RSS: {data.application.runtime.nodejs.rss}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 의존성 서비스 상태 */}
                <section className="dependencies">
                    <h2>🔗 의존성 서비스</h2>
                    <div className="services-grid">
                        <div className="service-card">
                            <div className="service-header">
                                <h3>📦 Redis Cache</h3>
                                <div
                                    className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(data.application.dependencies.redis.status) }}
                                ></div>
                            </div>
                            <div className="service-details">
                                <div className="service-metric">
                                    <span>상태: {data.application.dependencies.redis.status}</span>
                                </div>
                                <div className="service-metric">
                                    <span>응답시간: {data.application.dependencies.redis.responseTime}</span>
                                </div>
                                <div className="service-metric">
                                    <span>마지막 확인: {new Date(data.application.dependencies.redis.lastCheck).toLocaleTimeString('ko-KR')}</span>
                                </div>
                                {data.application.dependencies.redis.error && (
                                    <div className="service-error">
                                        오류: {data.application.dependencies.redis.error}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="service-card">
                            <div className="service-header">
                                <h3>🗄️ PostgreSQL</h3>
                                <div
                                    className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(data.application.dependencies.postgresql.status) }}
                                ></div>
                            </div>
                            <div className="service-details">
                                <div className="service-metric">
                                    <span>상태: {data.application.dependencies.postgresql.status}</span>
                                </div>
                                <div className="service-metric">
                                    <span>응답시간: {data.application.dependencies.postgresql.responseTime}</span>
                                </div>
                                <div className="service-metric">
                                    <span>마지막 확인: {new Date(data.application.dependencies.postgresql.lastCheck).toLocaleTimeString('ko-KR')}</span>
                                </div>
                                {data.application.dependencies.postgresql.error && (
                                    <div className="service-error">
                                        오류: {data.application.dependencies.postgresql.error}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Prometheus 모니터링 상태 */}
                <section className="prometheus-status">
                    <h2>📊 모니터링 시스템</h2>
                    <div className="prometheus-card">
                        <div className="prometheus-header">
                            <h3>Prometheus</h3>
                            <div
                                className="status-indicator"
                                style={{ backgroundColor: data.prometheus.connected ? '#4ade80' : '#f87171' }}
                            ></div>
                        </div>
                        <div className="prometheus-details">
                            <div className="prometheus-metric">
                                <span>연결 상태: {data.prometheus.connected ? '연결됨' : '연결 안됨'}</span>
                            </div>
                            <div className="prometheus-metric">
                                <span>마지막 스크래핑: {new Date(data.prometheus.lastScrape).toLocaleTimeString('ko-KR')}</span>
                            </div>
                            <div className="prometheus-metric">
                                <span>수집된 메트릭: {data.prometheus.metricsCount}개</span>
                            </div>
                            <div className="prometheus-metric">
                                <span>쿼리 시간: {data.prometheus.queryTime}</span>
                            </div>
                            {data.prometheus.issues && data.prometheus.issues.length > 0 && (
                                <div className="prometheus-issues">
                                    <h4>⚠️ 문제:</h4>
                                    <ul>
                                        {data.prometheus.issues.map((issue, index) => (
                                            <li key={index}>{issue}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ServerStatus;