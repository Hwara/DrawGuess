// services/statisticsService.js
// 통계 계산 및 데이터베이스 저장 서비스

const DatabaseModels = require('../models/DatabaseModels');

class StatisticsService {

    /**
     * 게임 종료 시 모든 데이터 저장 및 통계 업데이트
     * @param {Object} gameRoom - GameRoom 인스턴스
     * @param {Array} finalScores - 최종 점수 배열 [{playerId, username, score}, ...]
     * @returns {Object} 저장 결과
     */
    static async saveGameResults(gameRoom, finalScores) {
        try {
            console.log(`💾 게임 결과 저장 시작: 방 ${gameRoom.roomId} (${finalScores.length}명)`);

            // 게임 데이터 준비
            const gameData = {
                roomName: gameRoom.roomName,
                maxRounds: gameRoom.maxRounds,
                createdAt: gameRoom.createdAt
            };

            // PostgreSQL에 게임 세션 및 플레이어 기록 저장
            const saveResult = await DatabaseModels.saveGameSession(gameData, finalScores);

            console.log(`✅ 게임 결과 저장 완료: 세션 ${saveResult.sessionId}`);
            console.log(`   저장된 플레이어: ${saveResult.savedPlayers}명`);
            console.log(`   게임 시간: ${saveResult.duration}초`);
            console.log(`   승자: ${saveResult.winner}`);

            return {
                success: true,
                sessionId: saveResult.sessionId,
                playersUpdated: saveResult.savedPlayers,
                winner: saveResult.winner,
                gameTime: saveResult.duration
            };

        } catch (error) {
            console.error('게임 결과 저장 실패:', error);

            // 저장에 실패해도 게임은 계속 진행되어야 함
            return {
                success: false,
                error: error.message,
                playersAffected: finalScores.length
            };
        }
    }

    /**
     * 실시간 리더보드 조회 (캐싱 적용)
     * @param {number} limit - 조회할 상위 인원 수
     * @returns {Object} 리더보드 데이터
     */
    static async getLeaderboard(limit = 20) {
        try {
            const startTime = Date.now();

            // PostgreSQL에서 리더보드 조회
            const leaderboard = await DatabaseModels.getLeaderboard(limit);

            const queryTime = Date.now() - startTime;
            console.log(`📊 리더보드 조회 완료: ${leaderboard.length}명 (${queryTime}ms)`);

            return {
                success: true,
                data: leaderboard,
                metadata: {
                    totalPlayers: leaderboard.length,
                    queryTime: queryTime,
                    lastUpdated: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('리더보드 조회 실패:', error);

            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    /**
     * 특정 사용자의 상세 통계 조회
     * @param {string} username - 사용자명
     * @returns {Object} 사용자 상세 통계
     */
    static async getUserDetailedStats(username) {
        try {
            const startTime = Date.now();

            // 병렬로 데이터 조회
            const [userStats, userRank, gameHistory] = await Promise.all([
                DatabaseModels.getOrCreateUserStats(username),
                DatabaseModels.getUserRank(username),
                DatabaseModels.getUserGameHistory(username, 5) // 최근 5게임
            ]);

            const queryTime = Date.now() - startTime;

            return {
                success: true,
                data: {
                    profile: {
                        username: userStats.username,
                        totalScore: userStats.total_score,
                        totalGames: userStats.total_games,
                        wins: userStats.wins,
                        bestScore: userStats.best_score,
                        joinDate: userStats.created_at
                    },
                    ranking: {
                        currentRank: userRank?.rank || null,
                        totalPlayers: null // 추후 계산 가능
                    },
                    statistics: {
                        avgScorePerGame: userStats.total_games > 0 ?
                            Math.round(userStats.total_score / userStats.total_games * 10) / 10 : 0,
                        winRate: userStats.total_games > 0 ?
                            Math.round(userStats.wins / userStats.total_games * 1000) / 10 : 0,
                        gamesThisWeek: 0, // 추후 구현 가능
                        improvement: 0    // 추후 구현 가능
                    },
                    recentGames: gameHistory.map(game => ({
                        date: game.created_at,
                        roomName: game.room_name,
                        score: game.final_score,
                        rank: game.rank_position,
                        totalPlayers: game.total_players,
                        isWin: game.rank_position === 1
                    }))
                },
                metadata: {
                    queryTime,
                    lastUpdated: userStats.updated_at
                }
            };

        } catch (error) {
            console.error('사용자 상세 통계 조회 실패:', error);

            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * 전체 게임 통계 조회 (대시보드용)
     * @returns {Object} 전체 게임 통계
     */
    static async getOverallStatistics() {
        try {
            const stats = await DatabaseModels.getGameStatistics();

            return {
                success: true,
                data: {
                    totalUsers: parseInt(stats.total_users) || 0,
                    totalGames: parseInt(stats.total_games) || 0,
                    avgPlayersPerGame: Math.round(parseFloat(stats.avg_players_per_game) * 10) / 10 || 0,
                    highestScore: parseInt(stats.highest_score) || 0,
                    avgGameDuration: Math.round(parseFloat(stats.avg_game_duration)) || 0
                }
            };

        } catch (error) {
            console.error('전체 통계 조회 실패:', error);

            return {
                success: false,
                error: error.message,
                data: {
                    totalUsers: 0,
                    totalGames: 0,
                    avgPlayersPerGame: 0,
                    highestScore: 0,
                    avgGameDuration: 0
                }
            };
        }
    }

    /**
     * 최근 게임 활동 조회
     * @param {number} limit - 조회할 게임 수
     * @returns {Object} 최근 게임 활동
     */
    static async getRecentActivity(limit = 10) {
        try {
            const sessions = await DatabaseModels.getRecentGameSessions(limit);

            const activities = sessions.map(session => ({
                sessionId: session.session_id,
                roomName: session.room_name,
                playTime: new Date(session.created_at),
                duration: session.game_duration,
                playerCount: session.total_players,
                winner: session.winner_username,
                participants: session.participants || []
            }));

            return {
                success: true,
                data: activities,
                metadata: {
                    count: activities.length,
                    lastUpdated: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('최근 활동 조회 실패:', error);

            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    /**
     * 게임 결과를 기반으로 사용자들에게 성과 메시지 생성
     * @param {Array} finalScores - 최종 점수 배열
     * @returns {Object} 각 사용자별 성과 메시지
     */
    static generateAchievementMessages(finalScores) {
        const messages = {};

        finalScores.forEach((player, index) => {
            const rank = index + 1;
            const score = player.score;

            let message = '';
            let badge = '';

            if (rank === 1) {
                message = `🏆 축하합니다! ${score}점으로 1등을 차지했습니다!`;
                badge = '👑 승자';
            } else if (rank === 2) {
                message = `🥈 훌륭해요! ${score}점으로 2등입니다!`;
                badge = '🥈 준우승';
            } else if (rank === 3) {
                message = `🥉 좋은 결과네요! ${score}점으로 3등입니다!`;
                badge = '🥉 3위';
            } else {
                message = `💪 수고하셨습니다! ${score}점을 획득했습니다!`;
                badge = '🎮 참가자';
            }

            messages[player.username] = {
                message,
                badge,
                score,
                rank
            };
        });

        return messages;
    }
}

module.exports = StatisticsService;