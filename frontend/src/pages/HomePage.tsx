import React from 'react';

const HomePage: React.FC = () => {
    return (
        <div className="home-page">
            <section className="hero">
                <div className="hero-content">
                    <h1>🎮 DrawGuess</h1>
                    <p className="hero-subtitle">하이브리드 클라우드 멀티플레이어 캐치마인드</p>
                    <p className="hero-description">
                        라즈베리파이 Kubernetes 클러스터와 AWS 클라우드가 만나는
                        실시간 온라인 그림 맞히기 게임
                    </p>

                    <div className="cta-buttons">
                        <button className="btn btn-primary" disabled>
                            🚧 게임 시작 (Phase 5에서 활성화)
                        </button>
                        <a href="/how-to-play" className="btn btn-secondary">
                            📖 게임 방법
                        </a>
                    </div>
                </div>
            </section>

            <section className="features">
                <div className="container">
                    <h2>✨ 특징</h2>
                    <div className="feature-grid">
                        <div className="feature-card">
                            <div className="feature-icon">⚡</div>
                            <h3>실시간 게임</h3>
                            <p>WebSocket 기반 지연시간 50ms 이하의 실시간 그림 그리기</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">🥧</div>
                            <h3>하이브리드 클라우드</h3>
                            <p>라즈베리파이 엣지 컴퓨팅 + AWS 관리형 서비스</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">👥</div>
                            <h3>멀티플레이어</h3>
                            <p>최대 8명이 함께하는 실시간 온라인 게임</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">📱</div>
                            <h3>크로스 플랫폼</h3>
                            <p>PC, 모바일, 태블릿 모든 디바이스 지원</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="tech-stack">
                <div className="container">
                    <h2>🛠️ 기술 스택</h2>
                    <div className="tech-categories">
                        <div className="tech-category">
                            <h3>🥧 Edge Computing</h3>
                            <div className="tech-tags">
                                <span className="tech-tag">Raspberry Pi 4</span>
                                <span className="tech-tag">Kubernetes</span>
                                <span className="tech-tag">Docker</span>
                                <span className="tech-tag">MetalLB</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <h3>☁️ AWS Cloud</h3>
                            <div className="tech-tags">
                                <span className="tech-tag">S3</span>
                                <span className="tech-tag">CloudFront</span>
                                <span className="tech-tag">RDS</span>
                                <span className="tech-tag">Route 53</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <h3>🔧 Development</h3>
                            <div className="tech-tags">
                                <span className="tech-tag">React</span>
                                <span className="tech-tag">TypeScript</span>
                                <span className="tech-tag">Node.js</span>
                                <span className="tech-tag">Socket.IO</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;