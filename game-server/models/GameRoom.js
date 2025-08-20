// models/GameRoom.js
// 게임 룸 관리 클래스

// 게임 설정
const GAME_SETTINGS = {
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 8,
    ROUND_TIME: 90, // 90초
    WORDS: [
        // 쉬운 단어들
        '고양이', '강아지', '집', '자동차', '나무', '꽃', '태양', '달',
        '물고기', '새', '사과', '바나나', '케이크', '피자', '모자', '신발',
        // 보통 단어들  
        '컴퓨터', '비행기', '기차', '병원', '학교', '도서관', '영화관', '카페',
        '우산', '안경', '시계', '카메라', '키보드', '마우스', '헤드폰', '스마트폰',
        // 어려운 단어들
        '라즈베리파이', '쿠버네티스', '하이브리드클라우드', '마이크로서비스', '컨테이너',
        '로드밸런서', '오케스트레이션', '스케일링', '모니터링', '파이프라인'
    ]
};

class GameRoom {
    constructor(roomId, creator, roomName = null) {
        this.roomId = roomId;
        this.roomName = roomName || `${creator.username}의 방`;
        this.creator = creator;
        this.players = new Map();
        this.status = 'waiting'; // waiting, playing, finished
        this.currentRound = 0;
        this.maxRounds = 3;
        this.currentDrawer = null;
        this.currentWord = null;
        this.roundStartTime = null;
        this.drawingData = [];
        this.chatHistory = [];
        this.scores = new Map();
        this.gameSettings = { ...GAME_SETTINGS };
        this.createdAt = Date.now();

        this.addPlayer(creator);
    }

    addPlayer(player) {
        if (this.players.size >= this.gameSettings.MAX_PLAYERS) {
            throw new Error('방이 가득 참');
        }

        this.players.set(player.id, {
            id: player.id,
            username: player.username,
            isReady: false,
            isDrawing: false,
            score: 0,
            joinTime: Date.now()
        });

        this.scores.set(player.id, 0);
        console.log(`🎮 플레이어 ${player.username}이 방 ${this.roomId}에 참여`);
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        this.scores.delete(playerId);

        // 방장이 나가면 다른 플레이어를 방장으로
        if (this.creator.id === playerId && this.players.size > 0) {
            this.creator = Array.from(this.players.values())[0];
        }

        // 모든 플레이어가 나가면 방 삭제
        if (this.players.size === 0) {
            return true; // 방 삭제 신호
        }

        return false;
    }

    startGame() {
        if (this.players.size < this.gameSettings.MIN_PLAYERS) {
            throw new Error('최소 인원 부족');
        }

        this.status = 'playing';
        this.currentRound = 1;
        this.startNewRound();
    }

    startNewRound() {
        // 다음 그리는 사람 선택
        const playerIds = Array.from(this.players.keys());
        const currentIndex = this.currentDrawer ?
            playerIds.indexOf(this.currentDrawer) : -1;
        const nextIndex = (currentIndex + 1) % playerIds.length;
        this.currentDrawer = playerIds[nextIndex];

        // 단어 선택
        this.currentWord = this.gameSettings.WORDS[
            Math.floor(Math.random() * this.gameSettings.WORDS.length)
        ];

        this.roundStartTime = Date.now();
        this.drawingData = [];

        // 라운드 시작 시에도 점수 동기화 확인
        this.players.forEach((player, id) => {
            player.isDrawing = (id === this.currentDrawer);
            player.score = this.scores.get(id) || 0; // 점수 동기화
        });

        console.log(`🎮 방 ${this.roomId} 라운드 ${this.currentRound} 시작`);
        console.log(`   그리는 사람: ${this.currentDrawer}`);
        console.log(`   단어: ${this.currentWord}`);
        console.log(`   현재 점수:`, Object.fromEntries(this.scores));
    }

    checkAnswer(playerId, answer) {
        if (this.status !== 'playing' || playerId === this.currentDrawer) {
            return false;
        }

        const isCorrect = answer.toLowerCase().trim() === this.currentWord.toLowerCase().trim();

        if (isCorrect) {
            // 점수 계산 (빨리 맞힐수록 높은 점수)
            const timeElapsed = Date.now() - this.roundStartTime;
            const timeBonus = Math.max(0, this.gameSettings.ROUND_TIME - Math.floor(timeElapsed / 1000));
            const answererPoints = 100 + timeBonus;

            // 정답자만 점수 획득 (출제자는 점수 없음)
            const oldAnswererScore = this.scores.get(playerId) || 0;
            this.scores.set(playerId, oldAnswererScore + answererPoints);

            // 핵심: players Map의 정답자 플레이어 객체 동기화
            if (this.players.has(playerId)) {
                this.players.get(playerId).score = this.scores.get(playerId);
            }

            console.log(`🎯 점수 업데이트 완료:`);
            console.log(`   정답자 ${playerId}: ${oldAnswererScore} → ${this.scores.get(playerId)} (+${answererPoints})`);
            console.log(`   출제자 ${this.currentDrawer}: 점수 변화 없음 (그리는 역할)`);

            // 동기화 검증 로그
            console.log(`🔍 동기화 확인:`);
            console.log(`   Player 객체 점수:`, Array.from(this.players.values()).map(p => ({ id: p.id, score: p.score })));
            console.log(`   Scores Map:`, Object.fromEntries(this.scores));
        }

        return isCorrect;
    }

    endRound() {
        if (this.currentRound >= this.maxRounds) {
            return this.endGame();
        } else {
            this.currentRound++;
            this.startNewRound();
            return null;
        }
    }

    endGame() {
        this.status = 'finished';

        // 최종 순위 계산
        const finalScores = Array.from(this.scores.entries())
            .map(([playerId, score]) => ({
                playerId,
                username: this.players.get(playerId)?.username,
                score
            }))
            .sort((a, b) => b.score - a.score);

        console.log(`🏆 게임 종료 - 방 ${this.roomId} 최종 순위:`, finalScores);
        return finalScores;
    }

    getGameState() {
        // 중요: players 배열 반환 시 scores Map과 강제 동기화
        const syncedPlayers = Array.from(this.players.values()).map(player => ({
            ...player,
            score: this.scores.get(player.id) || 0 // scores Map의 값으로 강제 동기화
        }));

        const gameState = {
            roomId: this.roomId,
            roomName: this.roomName,
            status: this.status,
            players: syncedPlayers, // 동기화된 플레이어 배열
            currentRound: this.currentRound,
            maxRounds: this.maxRounds,
            currentDrawer: this.currentDrawer,
            currentWord: this.status === 'playing' ?
                (this.currentDrawer ? this.currentWord : null) : null,
            roundStartTime: this.roundStartTime,
            scores: Object.fromEntries(this.scores), // scores Map을 객체로 변환
            drawingData: this.drawingData,
            chatHistory: this.chatHistory.slice(-50),
            createdAt: this.createdAt
        };

        // 디버깅용 로그 (임시)
        console.log(`📊 getGameState 호출 - 방 ${this.roomId}:`);
        console.log(`   플레이어 수: ${syncedPlayers.length}`);
        console.log(`   점수 현황:`, syncedPlayers.map(p => `${p.username}: ${p.score}`).join(', '));

        return gameState;
    }

    // 그림 포인트 추가 (향상된 버전)
    addDrawingPoint(drawingPoint) {
        const enhancedPoint = {
            ...drawingPoint,
            timestamp: Date.now(),
            userId: drawingPoint.userId || this.currentDrawer
        };

        this.drawingData.push(enhancedPoint);
        return enhancedPoint;
    }

    // 캔버스 지우기
    clearCanvas(userId) {
        const clearEvent = {
            type: 'clear',
            userId: userId,
            timestamp: Date.now()
        };

        this.drawingData.push(clearEvent);
        return clearEvent;
    }

    // 그림 히스토리 가져오기 (최근 1000개 제한)
    getDrawingHistory() {
        return this.drawingData.slice(-1000);
    }
}

module.exports = { GameRoom, GAME_SETTINGS };