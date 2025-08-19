import React, { useState, useEffect } from 'react';

// 타입 정의
interface LeaderboardEntry {
    rank: number;
    username: string;
    total_score: number;
    total_games: number;
    wins: number;
    best_score: number;
    avg_score_per_game: number;
    win_rate_percent: number;
    updated_at: string;
}

interface OverallStats {
    totalUsers: number;
    totalGames: number;
    avgPlayersPerGame: number;
    highestScore: number;
    avgGameDuration: number;
}

interface RecentActivity {
    sessionId: string;
    roomName: string;
    playTime: string;
    duration: number;
    playerCount: number;
    winner: string;
    participants: Array<{
        username: string;
        final_score: number;
        rank_position: number;
    }>;
}

export const Leaderboard: React.FC = () => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // API 서버 URL
    const API_BASE = process.env.NODE_ENV === 'production'
        ? 'https://api.hwara-dev.kr'
        : 'http://localhost:3000';

    // 데이터 로드 함수
    const loadLeaderboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 병렬로 모든 데이터 조회
            const [leaderboardRes, statsRes, activityRes] = await Promise.all([
                fetch(`${API_BASE}/api/leaderboard?limit=20`),
                fetch(`${API_BASE}/api/stats/overview`),
                fetch(`${API_BASE}/api/recent-activity?limit=5`)
            ]);

            // 리더보드 데이터
            if (leaderboardRes.ok) {
                const leaderboardData = await leaderboardRes.json();
                if (leaderboardData.success) {
                    setLeaderboard(leaderboardData.leaderboard);
                }
            }

            // 전체 통계
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                if (statsData.success) {
                    setOverallStats(statsData.data);
                }
            }

            // 최근 활동
            if (activityRes.ok) {
                const activityData = await activityRes.json();
                if (activityData.success) {
                    setRecentActivity(activityData.data);
                }
            }

            setLastUpdated(new Date());

        } catch (err) {
            console.error('리더보드 데이터 로드 오류:', err);
            setError('데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 컴포넌트 마운트 시 데이터 로드
    useEffect(() => {
        loadLeaderboardData();
    }, []);

    // 순위 아이콘 결정
    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${rank}`;
        }
    };

    // 시간 포맷팅
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 게임 시간 포맷팅
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="simple-page">
                <div className="container">
                    <h1>🏆 순위표</h1>
                    <div className="content" style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📊</div>
                        <p>데이터를 불러오는 중...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="simple-page">
                <div className="container">
                    <h1>🏆 순위표</h1>
                    <div className="content">
                        <div style={{
                            background: 'rgba(255, 0, 0, 0.1)',
                            border: '1px solid rgba(255, 0, 0, 0.3)',
                            borderRadius: '10px',
                            padding: '1rem',
                            textAlign: 'center'
                        }}>
                            <p>⚠️ {error}</p>
                            <button
                                onClick={loadLeaderboardData}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    borderRadius: '5px',
                                    padding: '0.5rem 1rem',
                                    color: 'white',
                                    cursor: 'pointer',
                                    marginTop: '1rem'
                                }}
                            >
                                다시 시도
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="simple-page">
            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1>🏆 순위표</h1>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                            onClick={loadLeaderboardData}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '5px',
                                padding: '0.5rem 1rem',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            🔄 새로고침
                        </button>
                        {lastUpdated && (
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                {formatDate(lastUpdated.toISOString())} 업데이트
                            </span>
                        )}
                    </div>
                </div>

                <div className="content">
                    {/* 전체 통계 */}
                    {overallStats && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '1rem',
                            marginBottom: '2rem'
                        }}>
                            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{overallStats.totalUsers}</div>
                                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>총 플레이어</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{overallStats.totalGames}</div>
                                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>총 게임 수</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{overallStats.highestScore}</div>
                                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>최고 점수</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatDuration(overallStats.avgGameDuration)}</div>
                                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>평균 게임 시간</div>
                            </div>
                        </div>
                    )}

                    {/* 순위표 */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>🥇 전체 순위</h3>

                        {leaderboard.length === 0 ? (
                            <div style={{
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                padding: '2rem',
                                textAlign: 'center'
                            }}>
                                <p>아직 게임을 완료한 플레이어가 없습니다.</p>
                                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                                    첫 번째 게임을 완료하고 순위표에 이름을 올려보세요!
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {leaderboard.map(player => (
                                    <div key={player.rank} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '60px 1fr auto auto auto',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '1rem',
                                        background: player.rank <= 3 ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255,255,255,0.1)',
                                        borderRadius: '10px',
                                        border: player.rank === 1 ? '2px solid gold' : 'none'
                                    }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center' }}>
                                            {getRankIcon(player.rank)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{player.username}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                최고: {player.best_score}점 | 승률: {player.win_rate_percent}%
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontWeight: 'bold', color: '#4ade80' }}>{player.total_score}점</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>총점</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontWeight: 'bold' }}>{player.total_games}게임</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>게임 수</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>{player.wins}승</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>승리</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 최근 활동 */}
                    {recentActivity.length > 0 && (
                        <div>
                            <h3 style={{ marginBottom: '1rem' }}>⚡ 최근 게임</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {recentActivity.map(game => (
                                    <div key={game.sessionId} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.8rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem'
                                    }}>
                                        <div>
                                            <span style={{ fontWeight: 'bold' }}>{game.roomName}</span>
                                            <span style={{ opacity: 0.7, marginLeft: '0.5rem' }}>
                                                ({game.playerCount}명 참여)
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <span>🏆 {game.winner}</span>
                                            <span style={{ opacity: 0.7 }}>{formatDate(game.playTime)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PostgreSQL 연동 완료 알림 */}
                    <div style={{
                        marginTop: '2rem',
                        padding: '1rem',
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '10px'
                    }}>
                        <strong>✅ 실시간 데이터 연동 완료!</strong><br />
                        이제 실제 게임 결과가 PostgreSQL에 저장되고 실시간으로 순위표에 반영됩니다!
                    </div>
                </div>
            </div>
        </div>
    );
};