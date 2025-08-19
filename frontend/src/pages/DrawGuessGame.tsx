// src/pages/DrawGuessGame.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useSocket, DrawingPoint, RoomListItem, Player, ChatMessage } from '../hooks/useSocket';
import DrawingCanvas, { DrawingCanvasRef } from '../components/DrawingCanvas';

const DrawGuessGame: React.FC = () => {
    const {
        connected,
        user,
        currentRoom,
        rooms,
        error,
        register,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        sendChatMessage,
        sendDrawing,
        clearCanvas,
        setDrawingHandlers,
        setGameCallbacks
    } = useSocket();

    const canvasRef = useRef<DrawingCanvasRef>(null);

    // 로컬 상태
    const [username, setUsername] = useState('');
    const [roomName, setRoomName] = useState('');
    const [chatMessage, setChatMessage] = useState('');
    const [gamePhase, setGamePhase] = useState<'login' | 'lobby' | 'room' | 'playing'>('login');
    const [correctAnswerAlert, setCorrectAnswerAlert] = useState<string | null>(null);
    const [gameFinished, setGameFinished] = useState<any[] | null>(null);

    // Canvas 이벤트 핸들러 설정
    useEffect(() => {
        if (setDrawingHandlers) {
            setDrawingHandlers({
                onDrawing: (point: DrawingPoint) => {
                    if (canvasRef.current) {
                        canvasRef.current.handleExternalDrawing(point);
                    }
                },
                onCanvasCleared: () => {
                    if (canvasRef.current) {
                        canvasRef.current.handleExternalCanvasClear();
                    }
                },
                onDrawingHistory: (history: DrawingPoint[]) => {
                    if (canvasRef.current) {
                        canvasRef.current.handleDrawingHistory(history);
                    }
                }
            });
        }
    }, [setDrawingHandlers]);

    // 게임 이벤트 콜백 설정
    useEffect(() => {
        if (setGameCallbacks) {
            setGameCallbacks({
                onCorrectAnswer: (data) => {
                    const isCurrentUser = data.userId === user?.id;
                    const message = isCurrentUser
                        ? `🎉 정답! "${data.word}" (${data.score}점)`
                        : `🎯 ${data.username}님이 "${data.word}" 정답!`;

                    setCorrectAnswerAlert(message);

                    // 정답 맞춘 후 그림 지우기
                    if (canvasRef.current) {
                        setTimeout(() => {
                            canvasRef.current?.handleExternalCanvasClear();
                        }, 1500); // 1.5초 후 지우기 (알림 확인 시간)
                    }

                    // 3초 후 알림 제거
                    setTimeout(() => {
                        setCorrectAnswerAlert(null);
                    }, 3000);
                },
                onGameFinished: (finalScores) => {
                    console.log('🏆 게임 완전 종료 처리:', finalScores);
                    setGameFinished(finalScores);

                    // 게임 종료 후 그림도 지우기
                    if (canvasRef.current) {
                        setTimeout(() => {
                            canvasRef.current?.handleExternalCanvasClear();
                        }, 1000);
                    }
                }
            });
        }
    }, [setGameCallbacks, user]);

    // 게임 페이즈 자동 업데이트
    useEffect(() => {
        if (!connected) {
            setGamePhase('login');
        } else if (!user) {
            setGamePhase('login');
        } else if (!currentRoom) {
            setGamePhase('lobby');
        } else if (currentRoom.status === 'waiting') {
            setGamePhase('room');
        } else if (currentRoom.status === 'playing') {
            setGamePhase('playing');
        }
    }, [connected, user, currentRoom]);

    // 로그인 처리
    const handleLogin = () => {
        if (username.trim()) {
            register(username.trim());
        }
    };

    // 방 생성 처리
    const handleCreateRoom = () => {
        createRoom(roomName.trim() || undefined);
    };

    // 채팅 전송
    const handleSendChat = () => {
        if (chatMessage.trim()) {
            sendChatMessage(chatMessage.trim());
            setChatMessage('');
        }
    };

    // 현재 플레이어가 그릴 수 있는지 체크
    const canCurrentUserDraw = (): boolean => {
        return !!(user && currentRoom &&
            currentRoom.status === 'playing' &&
            currentRoom.currentDrawer === user.id);
    };

    // 로딩 상태
    if (!connected) {
        return (
            <div className="game-container">
                <div className="loading-screen">
                    <h2>🔌 서버에 연결 중...</h2>
                    <p>DrawGuess 게임 서버에 연결하고 있습니다.</p>
                    {error && <div className="error-message">❌ {error}</div>}
                </div>
            </div>
        );
    }

    // 로그인 화면
    if (gamePhase === 'login') {
        return (
            <div className="game-container">
                <div className="login-screen">
                    <div className="login-card">
                        <h1>🎮 DrawGuess</h1>
                        <p>실시간 멀티플레이어 캐치마인드 게임</p>

                        <div className="login-form">
                            <input
                                type="text"
                                placeholder="닉네임을 입력하세요"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                className="username-input"
                                maxLength={20}
                            />
                            <button
                                onClick={handleLogin}
                                disabled={!username.trim()}
                                className="login-button"
                            >
                                게임 시작
                            </button>
                        </div>

                        {error && <div className="error-message">❌ {error}</div>}
                    </div>
                </div>
            </div>
        );
    }

    // 로비 화면 (방 목록)
    if (gamePhase === 'lobby') {
        return (
            <div className="game-container">
                <div className="lobby-screen">
                    <div className="lobby-header">
                        <h2>🏠 게임 로비</h2>
                        <p>안녕하세요, <strong>{user?.username}</strong>님!</p>
                    </div>

                    <div className="lobby-content">
                        {/* 방 생성 */}
                        <div className="create-room-section">
                            <h3>새 방 만들기</h3>
                            <div className="create-room-form">
                                <input
                                    type="text"
                                    placeholder="방 이름 (선택사항)"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    className="room-name-input"
                                    maxLength={50}
                                />
                                <button onClick={handleCreateRoom} className="create-room-button">
                                    방 만들기
                                </button>
                            </div>
                        </div>

                        {/* 방 목록 */}
                        <div className="room-list-section">
                            <h3>참여 가능한 방 ({rooms.length}개)</h3>
                            <div className="room-list">
                                {rooms.length === 0 ? (
                                    <div className="no-rooms">
                                        현재 참여 가능한 방이 없습니다. 새로운 방을 만들어보세요!
                                    </div>
                                ) : (
                                    rooms.map((room: RoomListItem) => (
                                        <div key={room.roomId} className="room-item">
                                            <div className="room-info">
                                                <div className="room-name">{room.roomName}</div>
                                                <div className="room-details">
                                                    👥 {room.playerCount}/{room.maxPlayers} |
                                                    📊 {room.status === 'waiting' ? '대기중' :
                                                        room.status === 'playing' ? '게임중' : '완료'}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => joinRoom(room.roomId)}
                                                disabled={room.playerCount >= room.maxPlayers || room.status !== 'waiting'}
                                                className="join-room-button"
                                            >
                                                {room.status !== 'waiting' ? '게임중' :
                                                    room.playerCount >= room.maxPlayers ? '가득참' : '참여'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {error && <div className="error-message">❌ {error}</div>}
                </div>
            </div>
        );
    }

    // 게임방 화면 (대기 중 또는 플레이 중)
    if (gamePhase === 'room' || gamePhase === 'playing') {
        const isPlaying = currentRoom?.status === 'playing';
        const isDrawing = canCurrentUserDraw(); // 이미 boolean을 반환함

        return (
            <div className="game-container">
                <div className="game-room">
                    {/* 게임 종료 결과 */}
                    {gameFinished && (
                        <div className="game-result-overlay">
                            <div className="game-result-card">
                                <h2>🏆 게임 종료!</h2>
                                <div className="final-scores">
                                    {gameFinished.map((player: any, index: number) => (
                                        <div key={player.playerId} className={`score-item rank-${index + 1}`}>
                                            <span className="rank">#{index + 1}</span>
                                            <span className="username">{player.username}</span>
                                            <span className="score">{player.score}점</span>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        setGameFinished(null);
                                        leaveRoom();
                                    }}
                                    className="back-to-lobby-button"
                                >
                                    로비로 돌아가기
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 정답 알림 */}
                    {correctAnswerAlert && (
                        <div className="correct-answer-alert">
                            {correctAnswerAlert}
                        </div>
                    )}

                    {/* 게임 헤더 */}
                    <div className="game-header">
                        <div className="room-info">
                            <h2>🏠 {currentRoom?.roomName}</h2>
                            <div className="game-status">
                                {isPlaying ? (
                                    <>
                                        🎮 라운드 {currentRoom?.currentRound}/{currentRoom?.maxRounds} |
                                        🎨 {currentRoom?.players?.find((p: Player) => p.id === currentRoom?.currentDrawer)?.username}님이 그리는 중
                                        {isDrawing && currentRoom?.currentWord && (
                                            <span className="current-word">| 단어: <strong>{currentRoom.currentWord}</strong></span>
                                        )}
                                    </>
                                ) : (
                                    `👥 ${currentRoom?.players?.length || 0}명 대기 중 (최소 2명 필요)`
                                )}
                            </div>
                        </div>

                        <div className="game-controls">
                            {!isPlaying && currentRoom?.players && currentRoom.players.length >= 2 && (
                                <button onClick={startGame} className="start-game-button">
                                    게임 시작
                                </button>
                            )}
                            <button onClick={leaveRoom} className="leave-room-button">
                                방 나가기
                            </button>
                        </div>
                    </div>

                    <div className="game-content">
                        {/* 왼쪽: 플레이어 목록 */}
                        <div className="players-panel">
                            <h3>플레이어 ({currentRoom?.players?.length || 0}/{currentRoom?.maxRounds || 8})</h3>
                            <div className="players-list">
                                {currentRoom?.players?.map((player: Player) => (
                                    <div
                                        key={player.id}
                                        className={`player-item ${player.isDrawing ? 'drawing' : ''} ${player.id === user?.id ? 'current-user' : ''}`}
                                    >
                                        <div className="player-name">
                                            {player.isDrawing && '🎨 '}
                                            {player.username}
                                            {player.id === user?.id && ' (나)'}
                                        </div>
                                        <div className="player-score">{player.score}점</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 중앙: 그리기 캔버스 */}
                        <div className="canvas-panel">
                            <DrawingCanvas
                                ref={canvasRef}
                                width={600}
                                height={450}
                                isDrawing={isDrawing}
                                onDrawing={sendDrawing}
                                onClearCanvas={clearCanvas}
                                disabled={!isPlaying}
                            />
                        </div>

                        {/* 오른쪽: 채팅 */}
                        <div className="chat-panel">
                            <h3>💬 채팅</h3>
                            <div className="chat-messages">
                                {currentRoom?.chatHistory?.slice(-20).map((message: ChatMessage) => (
                                    <div
                                        key={message.id}
                                        className={`chat-message ${message.isAnswer ? 'answer' : ''} ${message.userId === user?.id ? 'own' : ''}`}
                                    >
                                        <span className="message-author">{message.username}:</span>
                                        <span className="message-text">{message.message}</span>
                                        {message.isAnswer && <span className="answer-badge">정답!</span>}
                                    </div>
                                ))}
                            </div>

                            <div className="chat-input">
                                <input
                                    type="text"
                                    placeholder={isDrawing ? "그리는 사람은 채팅할 수 없습니다" : "메시지를 입력하세요..."}
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                                    disabled={isDrawing}
                                    className="chat-message-input"
                                />
                                <button
                                    onClick={handleSendChat}
                                    disabled={!chatMessage.trim() || isDrawing}
                                    className="send-chat-button"
                                >
                                    전송
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {error && <div className="error-message">❌ {error}</div>}
            </div>
        );
    }

    return null;
};

export default DrawGuessGame;