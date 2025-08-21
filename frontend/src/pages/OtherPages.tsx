import React from 'react';

// 게임 방법 페이지
export const HowToPlay: React.FC = () => {
    return (
        <div className="simple-page">
            <div className="container">
                <h1>📖 게임 방법</h1>
                <div className="content">
                    <h3>🎨 기본 룰</h3>
                    <p>1. 방을 만들거나 기존 방에 참여합니다 (최대 8명)</p>
                    <p>2. 순서대로 돌아가며 주어진 단어를 그림으로 표현합니다</p>
                    <p>3. 다른 플레이어들은 채팅으로 정답을 맞힙니다</p>
                    <p>4. 맞힌 사람이 점수를 획득합니다</p>

                    <h3>⏱️ 시간 제한</h3>
                    <p>• 그리기 시간: 90초</p>
                    <p>• 총 라운드 시간: 120초</p>

                    <h3>🎮 조작 방법</h3>
                    <p>• PC: 마우스로 그리기 + 키보드 채팅</p>
                    <p>• 모바일: 터치로 그리기 + 터치 채팅</p>

                    <h3>🏆 점수 시스템</h3>
                    <p>• 정답자: 100점 + 시간 보너스 (빠를수록 높음)</p>
                    <p>• 순위표에서 누적 점수 확인 가능</p>

                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        <strong>✅ 완전히 동작하는 멀티플레이어 게임!</strong><br />
                        실시간 그림 그리기, 채팅, 순위 시스템 모두 완성되어 24/7 운영 중입니다!
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
                <h1>🚀 프로젝트 소개</h1>
                <div className="content">

                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        <strong>🎯 학습 프로젝트 운영 중!</strong> 하이브리드 클라우드와 GitOps를 학습하며 실제 서비스를 운영해보고 있습니다.
                    </div>

                    <h3>🎯 프로젝트 목표</h3>
                    <p>하이브리드 클라우드 환경과 GitOps 방식을 학습하기 위해 시작한 프로젝트입니다.
                        실시간 멀티플레이어 게임을 통해 엣지 컴퓨팅과 클라우드 서비스 연동을 경험해보고 있습니다.</p>

                    <h3>🏗️ 하이브리드 아키텍처 구성</h3>
                    <div style={{ textAlign: 'left', margin: '1rem 0' }}>
                        <p><strong>🥧 라즈베리파이 Kubernetes:</strong> 실시간 게임 로직, GitOps 학습</p>
                        <p><strong>☁️ AWS 클라우드:</strong> PostgreSQL RDS, S3 스토리지</p>
                        <p><strong>🌐 Cloudflare CDN:</strong> DNS 관리, CDN 서비스</p>
                        <p><strong>🔗 Tailscale VPN:</strong> 하이브리드 네트워킹 연습</p>
                    </div>

                    <h3>🚀 학습한 Phase 및 주요 내용</h3>
                    <div style={{ textAlign: 'left', margin: '1rem 0' }}>
                        <p>✅ <strong>Phase 1:</strong> Terraform으로 AWS 인프라 구성</p>
                        <p>✅ <strong>Phase 2:</strong> S3 정적 웹사이트 호스팅</p>
                        <p>✅ <strong>Phase 3:</strong> 라즈베리파이 K8s 클러스터 구축</p>
                        <p>✅ <strong>Phase 4:</strong> Tailscale VPN으로 하이브리드 연결</p>
                        <p>✅ <strong>Phase 5:</strong> Socket.IO 실시간 멀티플레이어 구현</p>
                        <p>✅ <strong>Phase 6:</strong> ArgoCD GitOps 배포 자동화</p>
                        <p>✅ <strong>Phase 7:</strong> PostgreSQL 데이터베이스 연동</p>
                        <p>✅ <strong>Phase 8:</strong> Grafana Loki 로깅 시스템</p>
                        <p>✅ <strong>Phase 9:</strong> AlertManager 알림 시스템</p>
                    </div>

                    <h3>🛠️ 학습한 기술들</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '10px' }}>
                            <h4>🚀 GitOps 학습</h4>
                            <p>• ArgoCD 배포 자동화</p>
                            <p>• Infrastructure as Code</p>
                            <p>• 선언적 시스템 관리</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '10px' }}>
                            <h4>📊 모니터링 구축</h4>
                            <p>• Prometheus 메트릭 수집</p>
                            <p>• Grafana Loki 로깅</p>
                            <p>• AlertManager 알림 설정</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '10px' }}>
                            <h4>🏗️ 하이브리드 구성</h4>
                            <p>• Redis 실시간 캐시</p>
                            <p>• PostgreSQL 영구 저장</p>
                            <p>• VPN 터널링 연결</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '10px' }}>
                            <h4>🎮 실시간 애플리케이션</h4>
                            <p>• Socket.IO 멀티플레이어</p>
                            <p>• Canvas 그리기 기능</p>
                            <p>• 채팅 및 순위 시스템</p>
                        </div>
                    </div>

                    <h3>🎓 학습한 내용들</h3>
                    <div style={{ textAlign: 'left', margin: '1rem 0' }}>
                        <p><strong>🏢 DevOps 기초:</strong> GitOps, CI/CD, 컨테이너 관리</p>
                        <p><strong>☁️ 하이브리드 클라우드:</strong> 물리적 인프라와 클라우드 연동</p>
                        <p><strong>📊 모니터링 시스템:</strong> 메트릭, 로그, 알림 구성</p>
                        <p><strong>🔧 ARM64 환경:</strong> 라즈베리파이 Kubernetes 운영</p>
                    </div>

                    <h3>🛠️ 전체 기술 스택</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', margin: '1rem 0' }}>
                        {[
                            'ArgoCD GitOps', 'Kubernetes', 'Docker', 'Terraform',
                            'AWS RDS', 'Prometheus', 'Grafana Loki', 'AlertManager',
                            'React', 'Node.js', 'TypeScript', 'Socket.IO',
                            'Redis', 'PostgreSQL', 'Tailscale VPN', 'Cloudflare CDN'
                        ].map(tech => (
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
                        <strong>🚀 GitHub:</strong> <a href="https://github.com/Hwara/DrawGuess" target="_blank" rel="noreferrer" style={{ color: '#60A5FA' }}>https://github.com/Hwara/DrawGuess</a><br />
                        <strong>🌐 라이브 데모:</strong> <a href="https://hwara-dev.kr" target="_blank" rel="noreferrer" style={{ color: '#60A5FA' }}>https://hwara-dev.kr</a><br />
                        <strong>📊 서버 상태:</strong> <a href="/server-status" style={{ color: '#60A5FA' }}>시스템 모니터링</a>
                    </div>
                </div>

                <div className="game-test">
                    <div className="container">
                        {/* 하이브리드 아키텍처 정보 */}
                        <section className="architecture-info">
                            <h2>🏗️ 하이브리드 아키텍처 상세</h2>
                            <div className="architecture-diagram">
                                <div className="arch-component local">
                                    <h3>🥧 라즈베리파이 Edge</h3>
                                    <ul>
                                        <li>• Node.js 게임 서버 (Socket.IO)</li>
                                        <li>• Redis 실시간 캐시</li>
                                        <li>• ArgoCD GitOps 컨트롤러</li>
                                        <li>• Prometheus + Grafana 모니터링</li>
                                        <li>• Grafana Loki 로깅</li>
                                        <li>• AlertManager 알림</li>
                                    </ul>
                                </div>

                                <div className="arch-arrow">
                                    <span>🔗</span>
                                    <small>Tailscale VPN<br />Zero-Trust</small>
                                </div>

                                <div className="arch-component cloud">
                                    <h3>☁️ AWS 클라우드</h3>
                                    <ul>
                                        <li>• PostgreSQL RDS (영구 데이터)</li>
                                        <li>• S3 (정적 자산 저장)</li>
                                        <li>• CloudWatch (클라우드 메트릭)</li>
                                        <li>• Secrets Manager (보안)</li>
                                    </ul>
                                </div>

                                <div className="arch-arrow">
                                    <span>🌐</span>
                                    <small>글로벌 CDN</small>
                                </div>

                                <div className="arch-component" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white' }}>
                                    <h3>🌐 Cloudflare</h3>
                                    <ul>
                                        <li>• DNS 관리 (hwara-dev.kr)</li>
                                        <li>• 글로벌 CDN & 캐싱</li>
                                        <li>• 무제한 DDoS 보호</li>
                                        <li>• SSL/TLS 인증서</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="data-flow">
                                <h4>📊 최적화된 데이터 흐름</h4>
                                <div className="flow-items">
                                    <div className="flow-item">
                                        <span className="flow-icon">⚡</span>
                                        <div className="flow-content">
                                            <strong>실시간 데이터 (Edge)</strong>
                                            <p>게임 세션, 그림 데이터, 채팅 → Redis (라즈베리파이)</p>
                                        </div>
                                    </div>
                                    <div className="flow-item">
                                        <span className="flow-icon">💾</span>
                                        <div className="flow-content">
                                            <strong>영구 데이터 (Cloud)</strong>
                                            <p>사용자 통계, 게임 기록, 순위 → PostgreSQL (AWS)</p>
                                        </div>
                                    </div>
                                    <div className="flow-item">
                                        <span className="flow-icon">🚀</span>
                                        <div className="flow-content">
                                            <strong>GitOps 자동화</strong>
                                            <p>Git Push → ArgoCD → Kubernetes 자동 배포</p>
                                        </div>
                                    </div>
                                    <div className="flow-item">
                                        <span className="flow-icon">📊</span>
                                        <div className="flow-content">
                                            <strong>통합 관찰성</strong>
                                            <p>메트릭 + 로그 + 알림 완전 자동화</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="benefits">
                                <h4>💡 하이브리드 클라우드 학습 포인트</h4>
                                <ul>
                                    <li>• <strong>역할 분담</strong>: 실시간 처리는 엣지에서, 영구 저장은 클라우드에서</li>
                                    <li>• <strong>네트워킹 경험</strong>: VPN 터널링으로 물리적/논리적 네트워크 연결</li>
                                    <li>• <strong>관리형 서비스 활용</strong>: AWS RDS, S3 등으로 운영 부담 경감</li>
                                    <li>• <strong>CDN 적용</strong>: Cloudflare를 통한 전역 콘텐츠 배포</li>
                                    <li>• <strong>GitOps 자동화</strong>: 선언적 배포 방식 학습</li>
                                    <li>• <strong>확장성 고려</strong>: Kubernetes 기반 수평 확장 가능</li>
                                </ul>
                            </div>
                        </section>

                        {/* DevOps 성숙도 */}
                        <section className="devops-maturity">
                            <h2>🚀 DevOps 학습 과정</h2>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '10px', margin: '1rem 0' }}>
                                <div style={{ textAlign: 'left' }}>
                                    <p>✅ <strong>Level 0:</strong> 수동 운영 (시작점)</p>
                                    <p>✅ <strong>Level 1:</strong> Infrastructure as Code 학습</p>
                                    <p>✅ <strong>Level 2:</strong> 기본 GitOps 이해</p>
                                    <p>✅ <strong>Level 3:</strong> 자동화된 GitOps 구현</p>
                                    <p>🔄 <strong>Level 4:</strong> 관찰성 시스템 구축 (현재 학습 중)</p>
                                    <p>📚 <strong>Level 5:</strong> 고급 운영 기법 (향후 학습 계획)</p>
                                </div>
                            </div>
                        </section>

                        {/* 학습 가치 */}
                        <section className="portfolio-value">
                            <h2>💼 학습한 내용들</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
                                <div style={{ background: 'rgba(34, 197, 94, 0.2)', padding: '1rem', borderRadius: '10px' }}>
                                    <h4>🏢 실무 기술 습득</h4>
                                    <p>• 하이브리드 클라우드 구성</p>
                                    <p>• ARM64 환경 최적화</p>
                                    <p>• GitOps 배포 자동화</p>
                                </div>
                                <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '10px' }}>
                                    <h4>📈 트렌드 기술 경험</h4>
                                    <p>• 컨테이너 오케스트레이션</p>
                                    <p>• 엣지 컴퓨팅 활용</p>
                                    <p>• 선언적 인프라 관리</p>
                                </div>
                                <div style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '1rem', borderRadius: '10px' }}>
                                    <h4>💡 문제 해결 경험</h4>
                                    <p>• 리소스 제약 환경 최적화</p>
                                    <p>• 네트워크 연결 설정</p>
                                    <p>• 모니터링 시스템 구축</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};