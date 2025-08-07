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
            </div>
        </div>
    );
};