import React from 'react';

// 게임 방법 페이지
export const HowToPlay: React.FC = () => {
    return (
        <div className="simple-page">
            <div className="container">
                <h1>📖 게임 방법</h1>
                <div className="content">
                    <h3>🎨 기본 룰</h3>
                    <p>1. 순서대로 돌아가며 주어진 단어를 그림으로 표현합니다</p>
                    <p>2. 다른 플레이어들은 채팅으로 정답을 맞힙니다</p>
                    <p>3. 그린 사람과 맞힌 사람 모두 점수를 획득합니다</p>

                    <h3>⏱️ 시간 제한</h3>
                    <p>• 그리기 시간: 90초</p>
                    <p>• 총 라운드 시간: 120초</p>

                    <h3>🎮 조작 방법</h3>
                    <p>• PC: 마우스로 그리기</p>
                    <p>• 모바일: 터치로 그리기</p>
                    <p>• 태블릿: 스타일러스 지원</p>

                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                        <strong>🚧 개발 중:</strong> 실제 게임은 Phase 5에서 라즈베리파이 클러스터와 함께 완성됩니다!
                    </div>
                </div>
            </div>
        </div>
    );
};

// 순위표 페이지
export const Leaderboard: React.FC = () => {
    const mockLeaderboard = [
        { rank: 1, name: '그림왕', score: 2850, games: 45 },
        { rank: 2, name: '캐치마인드마스터', score: 2630, games: 38 },
        { rank: 3, name: '피카소', score: 2420, games: 41 },
        { rank: 4, name: '레오나르도', score: 2180, games: 33 },
        { rank: 5, name: '모네', score: 1950, games: 29 }
    ];

    return (
        <div className="simple-page">
            <div className="container">
                <h1>🏆 순위표</h1>
                <div className="content">
                    <div style={{ marginBottom: '2rem' }}>
                        <h3>🥇 전체 순위 (더미 데이터)</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {mockLeaderboard.map(player => (
                            <div key={player.rank} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '1.5rem', width: '40px' }}>
                                        {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
                                    </span>
                                    <span style={{ fontWeight: 'bold' }}>{player.name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                    <span>{player.score}점</span>
                                    <span style={{ opacity: 0.7 }}>{player.games}게임</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                        <strong>📊 실시간 순위:</strong> 라즈베리파이 클러스터 구축 후 실제 데이터로 업데이트됩니다!
                    </div>
                </div>
            </div>
        </div>
    );
};

// 소개 페이지
export const About: React.FC = () => {
    return (
        <div className="simple-page">
            <div className="container">
                <h1>📞 프로젝트 소개</h1>
                <div className="content">
                    <h3>🎯 프로젝트 목표</h3>
                    <p>하이브리드 클라우드 환경에서 실시간 멀티플레이어 게임을 구현하여
                        엣지 컴퓨팅과 클라우드 서비스의 장점을 모두 활용합니다.</p>

                    <h3>🏗️ 아키텍처 설계</h3>
                    <div style={{ textAlign: 'left', margin: '1rem 0' }}>
                        <p><strong>🥧 라즈베리파이 클러스터:</strong> 실시간 게임 로직 처리</p>
                        <p><strong>☁️ AWS 클라우드:</strong> 사용자 데이터 및 관리형 서비스</p>
                        <p><strong>🔗 하이브리드 연결:</strong> Tailscale VPN으로 안전한 연결</p>
                    </div>

                    <h3>💰 비용 최적화</h3>
                    <p>풀 클라우드 대비 70% 비용 절약 (월 $25 vs $85)</p>

                    <h3>📊 학습 로드맵</h3>
                    <div style={{ textAlign: 'left', margin: '1rem 0' }}>
                        <p>✅ <strong>Phase 1:</strong> AWS 정적 웹사이트 (완료)</p>
                        <p>🔄 <strong>Phase 2:</strong> 동적 웹 애플리케이션</p>
                        <p>⏳ <strong>Phase 3:</strong> 라즈베리파이 K8s 클러스터</p>
                        <p>⏳ <strong>Phase 4:</strong> 하이브리드 클라우드 연결</p>
                        <p>⏳ <strong>Phase 5:</strong> 실시간 멀티플레이어 게임</p>
                        <p>⏳ <strong>Phase 6:</strong> 운영 & 모니터링</p>
                    </div>

                    <h3>🛠️ 핵심 기술</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', margin: '1rem 0' }}>
                        {['Kubernetes', 'Docker', 'Terraform', 'AWS', 'React', 'Node.js', 'TypeScript', 'Socket.IO', 'Redis', 'PostgreSQL'].map(tech => (
                            <span key={tech} style={{
                                background: 'rgba(255,255,255,0.2)',
                                padding: '0.3rem 0.8rem',
                                borderRadius: '15px',
                                fontSize: '0.9rem'
                            }}>
                                {tech}
                            </span>
                        ))}
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                        <strong>🚀 GitHub:</strong> 모든 코드는 오픈소스로 공개됩니다!<br />
                        <strong>📖 블로그:</strong> 구축 과정을 단계별로 문서화하여 공유합니다.
                    </div>
                </div>
                <div className="game-test">
                    <div className="container">
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
                    </div>
                </div>
            </div>

        </div>

    );
};