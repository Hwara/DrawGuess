import React from 'react';

const HomePage: React.FC = () => {
    return (
        <div className="home-page">
            <section className="hero">
                <div className="hero-content">
                    <h1>🎮 DrawGuess</h1>
                    <p className="hero-subtitle">하이브리드 클라우드 학습을 위한 멀티플레이어 캐치마인드</p>
                    <p className="hero-description">
                        라즈베리파이 Kubernetes와 AWS 클라우드를 연결하여<br />
                        실시간 온라인 그림 맞히기 게임을 구현해보는 학습 프로젝트
                    </p>

                    <div className="status-indicators">
                        <div className="status-item">
                            <span className="status-dot online"></span>
                            <span>학습 프로젝트 운영 중</span>
                        </div>
                        <div className="status-item">
                            <span className="status-dot online"></span>
                            <span>GitOps 배포 연습</span>
                        </div>
                        <div className="status-item">
                            <span className="status-dot online"></span>
                            <span>모니터링 학습</span>
                        </div>
                    </div>

                    <div className="cta-buttons">
                        <a href="/draw-guess" className="btn btn-primary">
                            🎮 게임 시작하기
                        </a>
                        <a href="/how-to-play" className="btn btn-secondary">
                            📖 게임 방법
                        </a>
                        <a href="/leaderboard" className="btn btn-tertiary">
                            🏆 순위표
                        </a>
                    </div>

                    <div className="quick-stats">
                        <div className="stat">
                            <span className="stat-number">GitOps</span>
                            <span className="stat-label">자동 배포</span>
                        </div>
                        <div className="stat">
                            <span className="stat-number">ARM64</span>
                            <span className="stat-label">엣지 컴퓨팅</span>
                        </div>
                        <div className="stat">
                            <span className="stat-number">하이브리드</span>
                            <span className="stat-label">클라우드</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features">
                <div className="container">
                    <h2>✨ 학습 특징</h2>
                    <div className="feature-grid">
                        <div className="feature-card featured">
                            <div className="feature-icon">🚀</div>
                            <h3>GitOps 학습</h3>
                            <p>ArgoCD를 활용한 선언적 배포 방식 학습</p>
                        </div>

                        <div className="feature-card featured">
                            <div className="feature-icon">🏗️</div>
                            <h3>하이브리드 클라우드</h3>
                            <p>물리적 인프라와 클라우드 서비스 연동 경험</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">⚡</div>
                            <h3>실시간 통신</h3>
                            <p>Socket.IO를 이용한 멀티플레이어 기능 구현</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">📊</div>
                            <h3>모니터링 시스템</h3>
                            <p>Prometheus, Grafana를 활용한 관찰성 구축</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">🔐</div>
                            <h3>보안 설계</h3>
                            <p>VPN 터널링과 다층 보안 아키텍처 학습</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">🥧</div>
                            <h3>ARM64 최적화</h3>
                            <p>라즈베리파이에서 Kubernetes 클러스터 운영</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="architecture-highlight">
                <div className="container">
                    <h2>🏗️ 하이브리드 아키텍처</h2>
                    <div className="arch-flow">
                        <div className="arch-step">
                            <div className="arch-icon">🌍</div>
                            <h3>Global CDN</h3>
                            <p>Cloudflare<br />DDoS 보호</p>
                        </div>
                        <div className="arch-arrow">→</div>
                        <div className="arch-step">
                            <div className="arch-icon">☁️</div>
                            <h3>AWS Cloud</h3>
                            <p>S3 + RDS<br />영구 데이터</p>
                        </div>
                        <div className="arch-arrow">→</div>
                        <div className="arch-step highlight">
                            <div className="arch-icon">🥧</div>
                            <h3>Edge K8s</h3>
                            <p>라즈베리파이<br />실시간 처리</p>
                        </div>
                    </div>
                    <p className="arch-description">
                        실시간 성능이 필요한 게임 로직은 엣지에서, 영구 저장이 필요한 데이터는 클라우드에서 처리하는 최적화된 아키텍처
                    </p>
                </div>
            </section>

            <section className="tech-stack">
                <div className="container">
                    <h2>🛠️ 핵심 기술 스택</h2>
                    <div className="tech-categories">
                        <div className="tech-category">
                            <h3>🚀 DevOps & 자동화</h3>
                            <div className="tech-tags">
                                <span className="tech-tag">ArgoCD GitOps</span>
                                <span className="tech-tag">GitHub Actions</span>
                                <span className="tech-tag">Kubernetes</span>
                                <span className="tech-tag">Docker</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <h3>📊 관찰성 (Observability)</h3>
                            <div className="tech-tags">
                                <span className="tech-tag">Prometheus</span>
                                <span className="tech-tag">Grafana Loki</span>
                                <span className="tech-tag">AlertManager</span>
                                <span className="tech-tag">Slack 연동</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <h3>🥧 Edge Computing</h3>
                            <div className="tech-tags">
                                <span className="tech-tag">Raspberry Pi 4</span>
                                <span className="tech-tag">ARM64 최적화</span>
                                <span className="tech-tag">MetalLB</span>
                                <span className="tech-tag">Private Registry</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <h3>☁️ 하이브리드 클라우드</h3>
                            <div className="tech-tags">
                                <span className="tech-tag">AWS RDS</span>
                                <span className="tech-tag">Tailscale VPN</span>
                                <span className="tech-tag">Cloudflare CDN</span>
                                <span className="tech-tag">Redis + PostgreSQL</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <h3>🎮 애플리케이션</h3>
                            <div className="tech-tags">
                                <span className="tech-tag">React + TypeScript</span>
                                <span className="tech-tag">Node.js + Express</span>
                                <span className="tech-tag">Socket.IO</span>
                                <span className="tech-tag">Canvas API</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="live-status">
                <div className="container">
                    <h2>📊 시스템 상태 확인</h2>
                    <div className="status-grid">
                        <a href="https://api.hwara-dev.kr/health" target="_blank" rel="noreferrer" className="status-card">
                            <h3>🏥 헬스체크</h3>
                            <p>기본 시스템 상태</p>
                            <span className="external-link">→</span>
                        </a>
                        <a href="/server-status" className="status-card">
                            <h3>📈 서버 상태</h3>
                            <p>상세 메트릭 대시보드</p>
                            <span className="external-link">→</span>
                        </a>
                        <div className="status-card">
                            <h3>🎯 Grafana</h3>
                            <p>모니터링 대시보드</p>
                            <small>내부 네트워크</small>
                        </div>
                        <div className="status-card">
                            <h3>🚀 ArgoCD</h3>
                            <p>GitOps 배포 상태</p>
                            <small>내부 네트워크</small>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;