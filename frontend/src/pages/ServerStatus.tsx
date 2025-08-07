import React, { useState, useEffect } from 'react';

// 더미 데이터 (향후 실제 API로 교체)
const mockServerData = {
    cluster: {
        status: 'healthy',
        nodes: 3,
        activeGames: 0,
        totalPlayers: 0,
        uptime: '2일 14시간 32분'
    },
    nodes: [
        {
            name: 'pi-master-01',
            status: 'healthy',
            cpu: 45,
            memory: 62,
            temperature: 58,
            ip: '192.168.1.100'
        },
        {
            name: 'pi-worker-01',
            status: 'healthy',
            cpu: 32,
            memory: 48,
            temperature: 52,
            ip: '192.168.1.101'
        },
        {
            name: 'pi-worker-02',
            status: 'healthy',
            cpu: 28,
            memory: 41,
            temperature: 49,
            ip: '192.168.1.102'
        }
    ],
    services: [
        { name: 'Game Server', status: 'ready', replicas: 3 },
        { name: 'Redis Cluster', status: 'ready', replicas: 3 },
        { name: 'Load Balancer', status: 'ready', replicas: 1 },
        { name: 'Monitoring', status: 'ready', replicas: 2 }
    ]
};

const ServerStatus: React.FC = () => {
    const [data, setData] = useState(mockServerData);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // 실시간 업데이트 시뮬레이션
    useEffect(() => {
        const interval = setInterval(() => {
            setLastUpdate(new Date());

            // CPU, 메모리 사용률 랜덤 변화 시뮬레이션
            setData(prev => ({
                ...prev,
                nodes: prev.nodes.map(node => ({
                    ...node,
                    cpu: Math.max(20, Math.min(80, node.cpu + (Math.random() - 0.5) * 10)),
                    memory: Math.max(30, Math.min(90, node.memory + (Math.random() - 0.5) * 8)),
                    temperature: Math.max(40, Math.min(70, node.temperature + (Math.random() - 0.5) * 4))
                }))
            }));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'ready':
                return '#4ade80'; // green
            case 'warning':
                return '#fbbf24'; // yellow
            case 'error':
                return '#f87171'; // red
            default:
                return '#94a3b8'; // gray
        }
    };

    const getUsageColor = (usage: number) => {
        if (usage < 50) return '#4ade80';
        if (usage < 75) return '#fbbf24';
        return '#f87171';
    };

    return (
        <div className="server-status">
            <div className="container">
                <div className="status-header">
                    <h1>📊 서버 상태</h1>
                    <div className="last-update">
                        <span className="pulse-dot"></span>
                        마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
                    </div>
                </div>

                {/* 클러스터 개요 */}
                <section className="cluster-overview">
                    <h2>🥧 라즈베리파이 클러스터</h2>
                    <div className="overview-grid">
                        <div className="overview-card">
                            <div className="card-icon">🖥️</div>
                            <div className="card-content">
                                <div className="card-value">{data.cluster.nodes}</div>
                                <div className="card-label">노드</div>
                            </div>
                        </div>

                        <div className="overview-card">
                            <div className="card-icon">🎮</div>
                            <div className="card-content">
                                <div className="card-value">{data.cluster.activeGames}</div>
                                <div className="card-label">활성 게임</div>
                            </div>
                        </div>

                        <div className="overview-card">
                            <div className="card-icon">👥</div>
                            <div className="card-content">
                                <div className="card-value">{data.cluster.totalPlayers}</div>
                                <div className="card-label">플레이어</div>
                            </div>
                        </div>

                        <div className="overview-card">
                            <div className="card-icon">⏱️</div>
                            <div className="card-content">
                                <div className="card-value">{data.cluster.uptime}</div>
                                <div className="card-label">가동시간</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 노드 상태 */}
                <section className="nodes-status">
                    <h2>🖥️ 노드 상태</h2>
                    <div className="nodes-grid">
                        {data.nodes.map((node, index) => (
                            <div key={index} className="node-card">
                                <div className="node-header">
                                    <h3>{node.name}</h3>
                                    <div
                                        className="status-indicator"
                                        style={{ backgroundColor: getStatusColor(node.status) }}
                                    ></div>
                                </div>

                                <div className="node-metrics">
                                    <div className="metric">
                                        <label>CPU</label>
                                        <div className="metric-bar">
                                            <div
                                                className="metric-fill"
                                                style={{
                                                    width: `${node.cpu}%`,
                                                    backgroundColor: getUsageColor(node.cpu)
                                                }}
                                            ></div>
                                        </div>
                                        <span>{node.cpu.toFixed(1)}%</span>
                                    </div>

                                    <div className="metric">
                                        <label>Memory</label>
                                        <div className="metric-bar">
                                            <div
                                                className="metric-fill"
                                                style={{
                                                    width: `${node.memory}%`,
                                                    backgroundColor: getUsageColor(node.memory)
                                                }}
                                            ></div>
                                        </div>
                                        <span>{node.memory.toFixed(1)}%</span>
                                    </div>

                                    <div className="metric">
                                        <label>Temperature</label>
                                        <div className="metric-bar">
                                            <div
                                                className="metric-fill"
                                                style={{
                                                    width: `${(node.temperature / 80) * 100}%`,
                                                    backgroundColor: getUsageColor((node.temperature / 80) * 100)
                                                }}
                                            ></div>
                                        </div>
                                        <span>{node.temperature.toFixed(1)}°C</span>
                                    </div>
                                </div>

                                <div className="node-footer">
                                    <small>IP: {node.ip}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 서비스 상태 */}
                <section className="services-status">
                    <h2>⚙️ 서비스 상태</h2>
                    <div className="services-grid">
                        {data.services.map((service, index) => (
                            <div key={index} className="service-card">
                                <div className="service-info">
                                    <h3>{service.name}</h3>
                                    <div className="service-details">
                                        <span
                                            className="service-status"
                                            style={{ color: getStatusColor(service.status) }}
                                        >
                                            {service.status.toUpperCase()}
                                        </span>
                                        <span className="service-replicas">
                                            {service.replicas}/{service.replicas} replicas
                                        </span>
                                    </div>
                                </div>
                                <div
                                    className="service-indicator"
                                    style={{ backgroundColor: getStatusColor(service.status) }}
                                ></div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 개발 노트 */}
                <section className="dev-note">
                    <div className="note-card">
                        <h3>🚧 개발 현황</h3>
                        <p><strong>현재 단계:</strong> Phase 1 - AWS 정적 웹사이트 호스팅</p>
                        <p><strong>다음 단계:</strong> Phase 3 - 라즈베리파이 Kubernetes 클러스터 구축</p>
                        <p><strong>연결 예정:</strong> 실제 클러스터 구축 후 이 페이지는 실시간 모니터링 대시보드로 전환됩니다.</p>

                        <div className="tech-progress">
                            <div className="progress-item">
                                <span>AWS Infrastructure</span>
                                <div className="progress-bar"><div className="progress-fill" style={{ width: '100%' }}></div></div>
                                <span>100%</span>
                            </div>
                            <div className="progress-item">
                                <span>React Website</span>
                                <div className="progress-bar"><div className="progress-fill" style={{ width: '75%' }}></div></div>
                                <span>75%</span>
                            </div>
                            <div className="progress-item">
                                <span>CI/CD Pipeline</span>
                                <div className="progress-bar"><div className="progress-fill" style={{ width: '25%' }}></div></div>
                                <span>25%</span>
                            </div>
                            <div className="progress-item">
                                <span>Raspberry Pi Cluster</span>
                                <div className="progress-bar"><div className="progress-fill" style={{ width: '0%' }}></div></div>
                                <span>0%</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ServerStatus;