// services/gameService.js
// 게임 관련 유틸리티 함수들

const { redisClient } = require('../config/database');

// Redis에 그림 히스토리 저장
async function saveDrawingToRedis(roomId, drawingPoint) {
    try {
        const key = `room:${roomId}:drawing:history`;

        // List에 추가 (최대 1000개 포인트로 제한)
        await redisClient.lPush(key, JSON.stringify(drawingPoint));
        await redisClient.lTrim(key, 0, 999); // 오래된 데이터는 자동 삭제

        // TTL 설정 (2시간 후 자동 삭제)
        await redisClient.expire(key, 7200);

        console.log(`💾 그림 데이터 Redis 저장: ${roomId}`);
    } catch (error) {
        console.error('Redis 그림 저장 오류:', error);
    }
}

// Redis에서 그림 히스토리 조회
async function getDrawingHistoryFromRedis(roomId) {
    try {
        const key = `room:${roomId}:drawing:history`;
        const historyStrings = await redisClient.lrange(key, 0, -1);

        // 최신순으로 정렬 (Redis List는 최신이 앞에 오므로 역순)
        const history = historyStrings
            .reverse()
            .map(str => JSON.parse(str))
            .sort((a, b) => a.timestamp - b.timestamp);

        console.log(`📖 Redis에서 그림 히스토리 조회: ${roomId} (${history.length}개)`);
        return history;
    } catch (error) {
        console.error('Redis 그림 조회 오류:', error);
        return [];
    }
}

// 방 삭제 시 그림 데이터 정리
async function cleanupRoomDrawing(roomId) {
    try {
        const key = `room:${roomId}:drawing:history`;
        await redisClient.del(key);
        console.log(`🗑️ 방 ${roomId} 그림 데이터 정리 완료`);
    } catch (error) {
        console.error('그림 데이터 정리 오류:', error);
    }
}

// 방 정보 Redis 저장
async function saveRoomToRedis(room) {
    try {
        const key = `room:${room.roomId}`;
        await redisClient.setEx(key, 3600, JSON.stringify(room.getGameState()));
    } catch (error) {
        console.error('Redis 방 저장 오류:', error);
    }
}

// 방 정보 Redis 삭제
async function deleteRoomFromRedis(roomId) {
    try {
        const key = `room:${roomId}`;
        await redisClient.del(key);
    } catch (error) {
        console.error('Redis 방 삭제 오류:', error);
    }
}

// 랜덤 방 ID 생성
function generateRoomId() {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 방 목록 조회용 변환 함수
function formatRoomForList(room) {
    return {
        roomId: room.roomId,
        roomName: room.roomName,
        playerCount: room.players.size,
        maxPlayers: room.gameSettings.MAX_PLAYERS,
        status: room.status,
        createdAt: room.createdAt
    };
}

// Redis Pub/Sub 이벤트 발행
async function publishGameEvent(redisPub, eventType, roomId, data) {
    try {
        const event = {
            type: eventType,
            room: roomId,
            data: data,
            timestamp: Date.now()
        };

        await redisPub.publish('game:events', JSON.stringify(event));
        console.log(`📡 Redis 이벤트 발행: ${eventType} for room ${roomId}`);
    } catch (error) {
        console.error('Redis 이벤트 발행 오류:', error);
    }
}

module.exports = {
    saveDrawingToRedis,
    getDrawingHistoryFromRedis,
    cleanupRoomDrawing,
    saveRoomToRedis,
    deleteRoomFromRedis,
    generateRoomId,
    formatRoomForList,
    publishGameEvent
};