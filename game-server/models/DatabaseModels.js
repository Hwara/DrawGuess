// models/DatabaseModels.js
// PostgreSQL 데이터베이스 모델 및 쿼리 함수들

const { pgPool } = require('../config/database');

class DatabaseModels {

    // ===== 사용자 통계 관련 =====

    /**
     * 사용자 통계 조회 또는 생성
     * @param {string} username - 사용자명
     * @returns {Object} 사용자 통계 객체
     */
    static async getOrCreateUserStats(username) {
        try {
            // 먼저 조회 시도
            const selectQuery = `
        SELECT * FROM user_stats 
        WHERE username = $1
      `;
            const result = await pgPool.query(selectQuery, [username]);

            if (result.rows.length > 0) {
                return result.rows[0];
            }

            // 없으면 새로 생성
            const insertQuery = `
        INSERT INTO user_stats (username) 
        VALUES ($1) 
        RETURNING *
      `;
            const insertResult = await pgPool.query(insertQuery, [username]);

            console.log(`👤 새 사용자 통계 생성: ${username}`);
            return insertResult.rows[0];

        } catch (error) {
            console.error('사용자 통계 조회/생성 오류:', error);
            throw error;
        }
    }

    /**
     * 사용자 통계 업데이트 (게임 결과 반영)
     * @param {string} username - 사용자명
     * @param {number} gameScore - 이번 게임 점수
     * @param {boolean} isWinner - 1등 여부
     */
    static async updateUserStats(username, gameScore, isWinner = false) {
        try {
            const updateQuery = `
        UPDATE user_stats 
        SET 
          total_score = total_score + $2,
          total_games = total_games + 1,
          wins = wins + $3,
          best_score = GREATEST(best_score, $2),
          updated_at = CURRENT_TIMESTAMP
        WHERE username = $1
        RETURNING *
      `;

            const result = await pgPool.query(updateQuery, [
                username,
                gameScore,
                isWinner ? 1 : 0
            ]);

            if (result.rows.length === 0) {
                // 사용자가 없으면 먼저 생성 후 다시 업데이트
                await this.getOrCreateUserStats(username);
                return await this.updateUserStats(username, gameScore, isWinner);
            }

            console.log(`📊 사용자 통계 업데이트: ${username} (+${gameScore}점, 승리: ${isWinner})`);
            return result.rows[0];

        } catch (error) {
            console.error('사용자 통계 업데이트 오류:', error);
            throw error;
        }
    }

    /**
     * 리더보드 조회 (상위 N명)
     * @param {number} limit - 조회할 인원 수 (기본 10명)
     * @returns {Array} 순위별 사용자 목록
     */
    static async getLeaderboard(limit = 10) {
        try {
            const query = `
        SELECT 
          ROW_NUMBER() OVER (ORDER BY total_score DESC, total_games ASC) as rank,
          username,
          total_score,
          total_games,
          wins,
          best_score,
          CASE 
            WHEN total_games > 0 THEN ROUND((total_score::NUMERIC / total_games::NUMERIC), 1)
            ELSE 0 
          END as avg_score_per_game,
          CASE 
            WHEN total_games > 0 THEN ROUND((wins::NUMERIC / total_games::NUMERIC * 100), 1)
            ELSE 0 
          END as win_rate_percent,
          updated_at
        FROM user_stats 
        WHERE total_games > 0
        ORDER BY total_score DESC, total_games ASC
        LIMIT $1
      `;

            const result = await pgPool.query(query, [limit]);
            return result.rows;

        } catch (error) {
            console.error('리더보드 조회 오류:', error);
            throw error;
        }
    }

    /**
     * 특정 사용자의 순위 조회
     * @param {string} username - 사용자명
     * @returns {Object} 사용자 순위 정보
     */
    static async getUserRank(username) {
        try {
            const query = `
        WITH ranked_users AS (
          SELECT 
            username,
            total_score,
            total_games,
            ROW_NUMBER() OVER (ORDER BY total_score DESC, total_games ASC) as rank
          FROM user_stats 
          WHERE total_games > 0
        )
        SELECT * FROM ranked_users 
        WHERE username = $1
      `;

            const result = await pgPool.query(query, [username]);
            return result.rows.length > 0 ? result.rows[0] : null;

        } catch (error) {
            console.error('사용자 순위 조회 오류:', error);
            throw error;
        }
    }

    // ===== 게임 세션 관련 =====

    /**
     * 게임 세션 저장
     * @param {Object} gameData - 게임 데이터
     * @param {Array} finalScores - 최종 점수 배열
     * @returns {Object} 저장된 게임 세션 정보
     */
    static async saveGameSession(gameData, finalScores) {
        const client = await pgPool.connect();

        try {
            await client.query('BEGIN');

            // 1. 게임 세션 저장
            const sessionQuery = `
        INSERT INTO game_sessions (
          room_name, 
          total_rounds, 
          total_players, 
          game_duration,
          winner_username
        ) VALUES ($1, $2, $3, $4, $5) 
        RETURNING session_id
      `;

            const gameDuration = Math.floor((Date.now() - gameData.createdAt) / 1000);
            const winner = finalScores.length > 0 ? finalScores[0].username : null;

            const sessionResult = await client.query(sessionQuery, [
                gameData.roomName,
                gameData.maxRounds,
                finalScores.length,
                gameDuration,
                winner
            ]);

            const sessionId = sessionResult.rows[0].session_id;

            // 2. 각 플레이어 기록 저장
            const participantQueries = finalScores.map((player, index) => {
                const participantQuery = `
          INSERT INTO game_participants (
            session_id, 
            username, 
            final_score, 
            rank_position,
            rounds_drawn,
            correct_answers
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `;

                // 간단한 통계 계산 (실제로는 게임 중 수집해야 하지만 일단 추정)
                const roundsDrawn = Math.floor(gameData.maxRounds / finalScores.length);
                const correctAnswers = Math.floor(player.score / 120); // 대략적 추정

                return client.query(participantQuery, [
                    sessionId,
                    player.username,
                    player.score,
                    index + 1, // 순위 (1등, 2등, ...)
                    roundsDrawn,
                    correctAnswers
                ]);
            });

            await Promise.all(participantQueries);

            // 3. 각 플레이어 통계 업데이트
            const statsUpdates = finalScores.map((player, index) => {
                const isWinner = index === 0; // 1등만 승리로 간주
                return this.updateUserStats(player.username, player.score, isWinner);
            });

            await Promise.all(statsUpdates);

            await client.query('COMMIT');

            console.log(`🎮 게임 세션 저장 완료: ${sessionId} (${finalScores.length}명)`);
            console.log(`   승자: ${winner} (${finalScores[0]?.score || 0}점)`);

            return {
                sessionId,
                savedPlayers: finalScores.length,
                winner,
                duration: gameDuration
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('게임 세션 저장 오류:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 최근 게임 세션 조회
     * @param {number} limit - 조회할 세션 수 (기본 10개)
     * @returns {Array} 최근 게임 세션 목록
     */
    static async getRecentGameSessions(limit = 10) {
        try {
            const query = `
        SELECT 
          gs.*,
          json_agg(
            json_build_object(
              'username', gp.username,
              'final_score', gp.final_score,
              'rank_position', gp.rank_position
            ) ORDER BY gp.rank_position
          ) as participants
        FROM game_sessions gs
        LEFT JOIN game_participants gp ON gs.session_id = gp.session_id
        GROUP BY gs.session_id
        ORDER BY gs.created_at DESC
        LIMIT $1
      `;

            const result = await pgPool.query(query, [limit]);
            return result.rows;

        } catch (error) {
            console.error('최근 게임 세션 조회 오류:', error);
            throw error;
        }
    }

    /**
     * 특정 사용자의 게임 히스토리 조회
     * @param {string} username - 사용자명
     * @param {number} limit - 조회할 게임 수 (기본 10개)
     * @returns {Array} 사용자 게임 히스토리
     */
    static async getUserGameHistory(username, limit = 10) {
        try {
            const query = `
        SELECT 
          gs.session_id,
          gs.room_name,
          gs.total_rounds,
          gs.total_players,
          gs.game_duration,
          gs.winner_username,
          gs.created_at,
          gp.final_score,
          gp.rank_position,
          gp.rounds_drawn,
          gp.correct_answers
        FROM game_participants gp
        JOIN game_sessions gs ON gp.session_id = gs.session_id
        WHERE gp.username = $1
        ORDER BY gs.created_at DESC
        LIMIT $2
      `;

            const result = await pgPool.query(query, [username, limit]);
            return result.rows;

        } catch (error) {
            console.error('사용자 게임 히스토리 조회 오류:', error);
            throw error;
        }
    }

    // ===== 통계 관련 =====

    /**
     * 전체 게임 통계 조회
     * @returns {Object} 전체 게임 통계
     */
    static async getGameStatistics() {
        try {
            const query = `
        SELECT 
          COUNT(DISTINCT username) as total_users,
          COUNT(*) as total_games,
          AVG(total_players) as avg_players_per_game,
          MAX(gp.final_score) as highest_score,
          AVG(game_duration) as avg_game_duration
        FROM game_sessions gs
        LEFT JOIN game_participants gp ON gs.session_id = gp.session_id
      `;

            const result = await pgPool.query(query);
            return result.rows[0];

        } catch (error) {
            console.error('게임 통계 조회 오류:', error);
            throw error;
        }
    }
}

module.exports = DatabaseModels;