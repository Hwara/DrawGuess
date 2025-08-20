// socket/socketHandlers.js
// Socket.IO 이벤트 핸들러들

const { GameRoom } = require('../models/GameRoom');
const {
    saveDrawingToRedis,
    getDrawingHistoryFromRedis,
    cleanupRoomDrawing,
    saveRoomToRedis,
    deleteRoomFromRedis,
    generateRoomId,
    formatRoomForList,
    publishGameEvent
} = require('../services/gameService');
const StatisticsService = require('../services/statisticsService');
const { redisPub } = require('../config/database');

function setupSocketHandlers(io, gameRooms, connectedUsers) {

    io.on('connection', (socket) => {
        console.log(`🔌 새로운 연결: ${socket.id}`);

        // ===== 사용자 등록 =====
        socket.on('register', async (userData) => {
            try {
                const user = {
                    id: socket.id,
                    username: userData.username || `Player_${socket.id.slice(0, 6)}`,
                    joinTime: Date.now()
                };

                connectedUsers.set(socket.id, user);
                socket.emit('registered', user);

                // 현재 방 목록 전송
                const rooms = Array.from(gameRooms.values()).map(formatRoomForList);
                socket.emit('room-list', rooms);

                console.log(`👤 사용자 등록: ${user.username} (${socket.id})`);

            } catch (error) {
                socket.emit('error', { message: '사용자 등록 실패', error: error.message });
            }
        });

        // ===== 방 생성 =====
        socket.on('create-room', async (roomData) => {
            try {
                const user = connectedUsers.get(socket.id);
                if (!user) {
                    socket.emit('error', { message: '사용자 등록이 필요합니다' });
                    return;
                }

                const roomId = generateRoomId();
                const roomName = roomData.name || roomData.roomName || `${user.username}의 방`;
                const room = new GameRoom(roomId, user, roomName);

                gameRooms.set(roomId, room);
                socket.join(roomId);

                // Redis에 방 정보 저장
                await saveRoomToRedis(room);

                socket.emit('room-created', room.getGameState());

                // 모든 클라이언트에 방 목록 업데이트 브로드캐스트
                io.emit('room-list-updated', formatRoomForList(room));

                console.log(`🏠 방 생성: ${roomId} (${roomName}) by ${user.username}`);

            } catch (error) {
                socket.emit('error', { message: '방 생성 실패', error: error.message });
            }
        });

        // ===== 방 참여 =====
        socket.on('join-room', async (data) => {
            try {
                const user = connectedUsers.get(socket.id);
                const room = gameRooms.get(data.roomId);

                if (!user || !room) {
                    socket.emit('error', { message: '방을 찾을 수 없습니다' });
                    return;
                }

                room.addPlayer(user);
                socket.join(data.roomId);

                // 방 상태 업데이트
                await saveRoomToRedis(room);

                // 방의 모든 플레이어에게 업데이트 전송
                io.to(data.roomId).emit('room-updated', room.getGameState());

                // 모든 클라이언트에 방 목록 업데이트 브로드캐스트
                io.emit('room-list-updated', formatRoomForList(room));

                socket.emit('joined-room', room.getGameState());

                // 그림 히스토리 복원
                try {
                    const drawingHistory = await getDrawingHistoryFromRedis(data.roomId);
                    if (drawingHistory && drawingHistory.length > 0) {
                        socket.emit('drawing-history', drawingHistory);
                        console.log(`🎨 그림 히스토리 전송: ${drawingHistory.length}개 포인트`);
                    }
                } catch (error) {
                    console.error('그림 히스토리 전송 오류:', error);
                }
            } catch (error) {
                socket.emit('error', { message: '방 참여 실패', error: error.message });
            }
        });

        // ===== 방 나가기 (명시적) =====
        socket.on('leave-room', async (data) => {
            try {
                await handlePlayerLeaveRoom(socket, data.roomId, gameRooms, connectedUsers, io);
            } catch (error) {
                socket.emit('error', { message: '방 나가기 실패', error: error.message });
            }
        });

        // ===== 게임 시작 =====
        socket.on('start-game', async (data) => {
            try {
                const room = gameRooms.get(data.roomId);
                if (!room) return;

                room.startGame();

                // 게임 시작을 Redis로 다른 포드에 알림
                await publishGameEvent(redisPub, 'game-started', data.roomId, room.getGameState());

                io.to(data.roomId).emit('game-started', room.getGameState());

            } catch (error) {
                socket.emit('error', { message: '게임 시작 실패', error: error.message });
            }
        });

        // ===== 그림 그리기 데이터 =====
        socket.on('drawing', async (data) => {
            try {
                const { roomId, ...drawingPoint } = data;
                const room = gameRooms.get(roomId);

                // 권한 확인: 방에 속해 있고, 현재 그리는 사람인지
                if (!room || room.currentDrawer !== socket.id) {
                    console.log(`🚫 그리기 권한 없음: ${socket.id} in room ${roomId}`);
                    return;
                }

                // DrawingPoint에 서버 정보 추가
                const enhancedDrawingPoint = {
                    ...drawingPoint,
                    userId: socket.id,
                    timestamp: Date.now()
                };

                // 메모리와 Redis에 저장
                room.addDrawingPoint(enhancedDrawingPoint);
                await saveDrawingToRedis(roomId, enhancedDrawingPoint);

                // 다른 플레이어들에게 브로드캐스트 (자기 제외)
                socket.to(roomId).emit('drawing', enhancedDrawingPoint);

                console.log(`🎨 그림 데이터 처리 완료: ${socket.id} in room ${roomId}`);

            } catch (error) {
                console.error('그리기 이벤트 처리 오류:', error);
                socket.emit('error', { message: '그리기 처리 중 오류가 발생했습니다.' });
            }
        });

        // ===== 캔버스 전체 지우기 =====
        socket.on('clear-canvas', async (data) => {
            try {
                const { roomId } = data;
                const room = gameRooms.get(roomId);

                // 권한 확인: 방에 속해 있고, 현재 그리는 사람인지
                if (!room || room.currentDrawer !== socket.id) {
                    socket.emit('error', { message: '캔버스를 지울 권한이 없습니다.' });
                    return;
                }

                // Clear 이벤트 생성
                const clearEvent = room.clearCanvas(socket.id);
                await saveDrawingToRedis(roomId, clearEvent);

                // 모든 사용자에게 브로드캐스트 (자기 포함)
                io.to(roomId).emit('canvas-cleared', {
                    roomId,
                    userId: socket.id,
                    timestamp: clearEvent.timestamp
                });

                console.log(`🧹 캔버스 지우기: ${socket.id} in room ${roomId}`);

            } catch (error) {
                console.error('캔버스 지우기 오류:', error);
                socket.emit('error', { message: '캔버스 지우기 중 오류가 발생했습니다.' });
            }
        });

        // ===== 채팅 메시지 =====
        socket.on('chat-message', async (data) => {
            try {
                const user = connectedUsers.get(socket.id);
                const room = gameRooms.get(data.roomId);

                if (!user || !room) return;

                const message = {
                    id: Date.now(),
                    userId: socket.id,
                    username: user.username,
                    message: data.message,
                    timestamp: Date.now(),
                    isAnswer: false
                };

                // 정답 체크 (개선된 버전)
                if (room.status === 'playing' && socket.id !== room.currentDrawer) {
                    const isCorrect = room.checkAnswer(socket.id, data.message);
                    if (isCorrect) {
                        message.isAnswer = true;

                        // Redis에 업데이트된 게임 상태 저장
                        await saveRoomToRedis(room);

                        // 정답 맞춤 이벤트 (점수 정보 포함)
                        io.to(data.roomId).emit('correct-answer', {
                            userId: socket.id,
                            username: user.username,
                            word: room.currentWord,
                            score: room.scores.get(socket.id) // 업데이트된 점수
                        });

                        // 즉시 업데이트된 게임 상태 전송
                        io.to(data.roomId).emit('room-updated', room.getGameState());

                        console.log(`🎯 정답 처리 완료: ${user.username} -> ${room.currentWord} (${room.scores.get(socket.id)}점)`);

                        // 라운드 종료 체크 (모든 사람이 맞췄거나 시간 초과)
                        setTimeout(async () => {
                            try {
                                const gameEnded = room.endRound();

                                // Redis에 업데이트된 상태 저장
                                saveRoomToRedis(room);

                                if (gameEnded !== null && gameEnded !== undefined) {
                                    // 🆕 게임 완전 종료 시 PostgreSQL에 저장
                                    console.log(`🏆 게임 종료: ${data.roomId} - DB 저장 시작`);

                                    try {
                                        const saveResult = await StatisticsService.saveGameResults(room, gameEnded);

                                        if (saveResult.success) {
                                            console.log(`💾 DB 저장 성공: 세션 ${saveResult.sessionId}`);

                                            // 성과 메시지 생성
                                            const achievements = StatisticsService.generateAchievementMessages(gameEnded);

                                            // 게임 종료 이벤트에 DB 저장 결과 포함
                                            io.to(data.roomId).emit('game-finished', {
                                                finalScores: gameEnded,
                                                gameState: room.getGameState(),
                                                dbSaved: true,
                                                sessionId: saveResult.sessionId,
                                                achievements: achievements
                                            });
                                        } else {
                                            console.error(`💾 DB 저장 실패: ${saveResult.error}`);

                                            // DB 저장 실패해도 게임 종료는 정상 처리
                                            io.to(data.roomId).emit('game-finished', {
                                                finalScores: gameEnded,
                                                gameState: room.getGameState(),
                                                dbSaved: false,
                                                error: '통계 저장에 실패했습니다'
                                            });
                                        }
                                    } catch (dbError) {
                                        console.error('DB 저장 중 예외 발생:', dbError);

                                        // 예외 발생해도 게임 종료는 정상 처리
                                        io.to(data.roomId).emit('game-finished', {
                                            finalScores: gameEnded,
                                            gameState: room.getGameState(),
                                            dbSaved: false,
                                            error: '통계 저장 중 오류가 발생했습니다'
                                        });
                                    }
                                } else {
                                    // 다음 라운드 시작
                                    io.to(data.roomId).emit('round-ended', room.getGameState());
                                    console.log(`🔄 라운드 종료: ${data.roomId} -> 라운드 ${room.currentRound}`);
                                }
                            } catch (error) {
                                console.error('라운드 종료 처리 오류:', error);
                            }
                        }, 2000);
                    }
                }

                room.chatHistory.push(message);
                io.to(data.roomId).emit('chat-message', message);

            } catch (error) {
                console.error('채팅 메시지 처리 오류:', error);
            }
        });

        // ===== 연결 해제 =====
        socket.on('disconnect', async () => {
            try {
                const user = connectedUsers.get(socket.id);
                if (user) {
                    console.log(`🔌 연결 해제: ${user.username} (${socket.id})`);

                    // 참여 중인 방에서 제거
                    for (const [roomId, room] of gameRooms.entries()) {
                        if (room.players.has(socket.id)) {
                            await handlePlayerLeaveRoom(socket, roomId, gameRooms, connectedUsers, io, true);
                            break;
                        }
                    }
                }

                connectedUsers.delete(socket.id);

            } catch (error) {
                console.error('연결 해제 처리 오류:', error);
            }
        });

    });
}

// ===== 헬퍼 함수: 플레이어 방 나가기 처리 =====
async function handlePlayerLeaveRoom(socket, roomId, gameRooms, connectedUsers, io, isDisconnect = false) {
    const user = connectedUsers.get(socket.id);
    const room = gameRooms.get(roomId);

    if (!user || !room) {
        if (!isDisconnect) {
            socket.emit('error', { message: '방을 찾을 수 없습니다' });
        }
        return;
    }

    // 방에서 플레이어 제거
    const shouldDeleteRoom = room.removePlayer(socket.id);
    socket.leave(roomId);

    if (shouldDeleteRoom) {
        // 방 삭제
        gameRooms.delete(roomId);
        await cleanupRoomDrawing(roomId);
        await deleteRoomFromRedis(roomId);
        console.log(`🗑️ 방 삭제됨: ${roomId}`);

        // 모든 클라이언트에 방 삭제 알림
        io.emit('room-deleted', { roomId: roomId });
    } else {
        // 방 상태 업데이트
        await saveRoomToRedis(room);

        // 방의 나머지 플레이어들에게 업데이트 전송
        io.to(roomId).emit('room-updated', room.getGameState());

        // 모든 클라이언트에 방 목록 업데이트 브로드캐스트
        io.emit('room-list-updated', formatRoomForList(room));
    }

    if (!isDisconnect) {
        socket.emit('left-room', { roomId: roomId });
    }

    const action = isDisconnect ? '자동 제거됨 (연결 해제)' : '나감';
    console.log(`🚪 플레이어 ${user.username}이 방 ${roomId}에서 ${action}`);
}

module.exports = { setupSocketHandlers };