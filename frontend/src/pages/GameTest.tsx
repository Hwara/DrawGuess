import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// 타입 정의
interface User {
    id: string;
    username: string;
    joinTime: number;
}

interface Player {
    id: string;
    username: string;
    isReady: boolean;
    isDrawing: boolean;
    score: number;
    joinTime: number;
}

interface RoomListItem {
    roomId: string;
    roomName: string;
    playerCount: number;
    maxPlayers: number;
    status: 'waiting' | 'playing' | 'finished';
    createdAt: number;
}

interface GameState {
    roomId: string;
    roomName: string;
    status: 'waiting' | 'playing' | 'finished';
    players: Player[];
    currentRound: number;
    maxRounds: number;
    currentDrawer: string | null;
    currentWord: string | null;
    roundStartTime: number | null;
    scores: Record<string, number>;
    chatHistory: ChatMessage[];
    createdAt: number;
}

interface ChatMessage {
    id: number;
    userId: string;
    username: string;
    message: string;
    timestamp: number;
    isAnswer: boolean;
}

interface GameError {
    message: string;
    error?: string;
    code?: string;
}

const GameTest: React.FC = () => {
    // Socket.IO 상태
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // 사용자 상태
    const [user, setUser] = useState<User | null>(null);
    const [username, setUsername] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    // 방 관련 상태
    const [rooms, setRooms] = useState<RoomListItem[]>([]);
    const [currentRoom, setCurrentRoom] = useState<GameState | null>(null);
    const [newRoomName, setNewRoomName] = useState('');
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);

    // 채팅 상태
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

    // 로그 상태
    const [logs, setLogs] = useState<string[]>([]);
    const [errors, setErrors] = useState<string[]>([]);

    // Refs
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const logsContainerRef = useRef<HTMLDivElement>(null);

    // 로그 함수
    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`]);
    };

    const addError = (error: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setErrors(prev => [...prev.slice(-9), `[${timestamp}] ❌ ${error}`]);
    };

    // Socket.IO 연결
    const connectToServer = () => {
        if (socket?.connected) {
            addLog('이미 서버에 연결되어 있습니다.');
            return;
        }

        addLog('서버에 연결 중...');
        setConnectionError(null);

        const newSocket = io('https://api.hwara-dev.kr', {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true
        });

        // 연결 이벤트
        newSocket.on('connect', () => {
            setConnected(true);
            setConnectionError(null);
            addLog(`✅ 서버 연결 성공 (ID: ${newSocket.id})`);
        });

        newSocket.on('disconnect', (reason) => {
            setConnected(false);
            addLog(`❌ 서버 연결 해제: ${reason}`);
            // 상태 초기화
            setUser(null);
            setCurrentRoom(null);
            setRooms([]);
            setChatHistory([]);
        });

        newSocket.on('connect_error', (error) => {
            setConnectionError(error.message);
            addError(`연결 오류: ${error.message}`);
        });

        // 사용자 등록 이벤트
        newSocket.on('registered', (userData: User) => {
            setUser(userData);
            setIsRegistering(false);
            addLog(`✅ 사용자 등록 완료: ${userData.username}`);
        });

        // 방 관련 이벤트
        newSocket.on('room-list', (roomList: RoomListItem[]) => {
            setRooms(roomList);
            addLog(`📋 방 목록 업데이트 (${roomList.length}개 방)`);
        });

        newSocket.on('room-list-updated', (roomInfo) => {
            addLog(`🔄 방 목록 실시간 업데이트`);
        });

        newSocket.on('room-deleted', (data) => {
            addLog(`🗑️ 방 삭제됨: ${data.roomId}`);
        });

        newSocket.on('room-created', (gameState: GameState) => {
            setCurrentRoom(gameState);
            setIsCreatingRoom(false);
            setChatHistory(gameState.chatHistory || []);
            addLog(`✅ 방 생성 완료: ${gameState.roomName}`);
        });

        newSocket.on('joined-room', (gameState: GameState) => {
            setCurrentRoom(gameState);
            setChatHistory(gameState.chatHistory || []);
            addLog(`✅ 방 참여 완료: ${gameState.roomName}`);
        });

        newSocket.on('left-room', (data) => {
            setCurrentRoom(null);
            setChatHistory([]);
            addLog(`✅ 방 나가기 완료: ${data.roomId}`);
        });

        newSocket.on('room-updated', (gameState: GameState) => {
            setCurrentRoom(gameState);
            addLog(`🔄 방 상태 업데이트: ${gameState.players.length}명`);
        });

        // 채팅 이벤트
        newSocket.on('chat-message', (message: ChatMessage) => {
            setChatHistory(prev => [...prev, message]);
            addLog(`💬 채팅: ${message.username}: ${message.message}`);
        });

        // 에러 이벤트
        newSocket.on('error', (error: GameError) => {
            addError(error.message);
        });

        setSocket(newSocket);
    };

    // 서버 연결 해제
    const disconnectFromServer = () => {
        if (socket) {
            socket.close();
            setSocket(null);
            setConnected(false);
            addLog('🔌 서버 연결 해제');
        }
    };

    // 사용자 등록
    const registerUser = () => {
        if (!socket || !username.trim()) {
            addError('사용자명을 입력하세요.');
            return;
        }

        setIsRegistering(true);
        socket.emit('register', { username: username.trim() });
        addLog(`👤 사용자 등록 요청: ${username.trim()}`);
    };

    // 방 생성
    const createRoom = () => {
        if (!socket || !user) {
            addError('먼저 사용자 등록을 해주세요.');
            return;
        }

        const roomName = newRoomName.trim() || `${user.username}의 방`;
        setIsCreatingRoom(true);
        socket.emit('create-room', { name: roomName });
        addLog(`🏠 방 생성 요청: ${roomName}`);
        setNewRoomName('');
    };

    // 방 참여
    const joinRoom = (roomId: string) => {
        if (!socket || !user) {
            addError('먼저 사용자 등록을 해주세요.');
            return;
        }

        socket.emit('join-room', { roomId });
        addLog(`🚪 방 참여 요청: ${roomId}`);
    };

    // 방 나가기
    const leaveRoom = () => {
        if (!socket || !currentRoom) {
            addError('참여한 방이 없습니다.');
            return;
        }

        socket.emit('leave-room', { roomId: currentRoom.roomId });
        addLog(`🚪 방 나가기 요청: ${currentRoom.roomId}`);
    };

    // 채팅 메시지 전송
    const sendChatMessage = () => {
        if (!socket || !currentRoom || !chatMessage.trim()) {
            return;
        }

        socket.emit('chat-message', {
            roomId: currentRoom.roomId,
            message: chatMessage.trim()
        });

        addLog(`💬 채팅 전송: ${chatMessage.trim()}`);
        setChatMessage('');
    };

    // 엔터키로 채팅 전송
    const handleChatKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    };

    // 스크롤 자동 이동
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // 컴포넌트 언마운트 시 연결 해제
    useEffect(() => {
        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, [socket]);

    return (
        <div className="main-content">
            <div className="container">
                {/* 페이지 헤더 */}
                <div className="game-test-header">
                    <h1>🎮 DrawGuess Socket.IO 게임 기능 테스트</h1>
                    <p>실시간 멀티플레이어 게임 기능을 테스트하는 페이지입니다</p>
                </div>

                {/* 연결 상태 카드 */}
                <div className="connection-status">
                    <div className="status-card">
                        <div className="card-header">
                            <h2>🔗 서버 연결</h2>
                            <div className="connection-indicator">
                                <div className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></div>
                                <span className={`status-text ${connected ? 'connected' : 'disconnected'}`}>
                                    {connected ? '연결됨' : '연결 안됨'}
                                </span>
                                {socket?.id && <span className="socket-id">ID: {socket.id}</span>}
                            </div>
                        </div>

                        {connectionError && (
                            <div className="error-alert">
                                <span>⚠️ 연결 오류: {connectionError}</span>
                            </div>
                        )}

                        <div className="button-group">
                            <button
                                onClick={connectToServer}
                                disabled={connected}
                                className="btn btn-primary"
                            >
                                연결
                            </button>
                            <button
                                onClick={disconnectFromServer}
                                disabled={!connected}
                                className="btn btn-secondary"
                            >
                                연결 해제
                            </button>
                        </div>
                    </div>
                </div>

                {/* 사용자 등록 카드 */}
                <div className="user-registration">
                    <div className="status-card">
                        <h2>👤 사용자 등록</h2>
                        {user ? (
                            <div className="success-alert">
                                <span>✅ 등록된 사용자: <strong>{user.username}</strong> (ID: {user.id})</span>
                            </div>
                        ) : (
                            <div className="input-group">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="사용자명 입력"
                                    className="game-input"
                                    disabled={!connected || isRegistering}
                                    onKeyPress={(e) => e.key === 'Enter' && registerUser()}
                                />
                                <button
                                    onClick={registerUser}
                                    disabled={!connected || !username.trim() || isRegistering}
                                    className="btn btn-primary"
                                >
                                    {isRegistering ? '등록 중...' : '등록'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 메인 게임 영역 */}
                <div className="game-main-grid">
                    {/* 방 관리 */}
                    <div className="room-management">
                        <div className="status-card">
                            <h2>🏠 방 관리</h2>

                            {/* 방 생성 */}
                            <div className="room-creation">
                                <h3>새 방 만들기</h3>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        value={newRoomName}
                                        onChange={(e) => setNewRoomName(e.target.value)}
                                        placeholder="방 이름 (선택사항)"
                                        className="game-input"
                                        disabled={!user || isCreatingRoom}
                                        onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                                    />
                                    <button
                                        onClick={createRoom}
                                        disabled={!user || isCreatingRoom}
                                        className="btn btn-accent"
                                    >
                                        {isCreatingRoom ? '생성 중...' : '생성'}
                                    </button>
                                </div>
                            </div>

                            {/* 현재 방 */}
                            {currentRoom && (
                                <div className="current-room">
                                    <h3>📍 현재 방</h3>
                                    <div className="room-info">
                                        <div className="room-details">
                                            <div><strong>방 이름:</strong> {currentRoom.roomName}</div>
                                            <div><strong>방 ID:</strong> <span className="room-id">{currentRoom.roomId}</span></div>
                                            <div><strong>플레이어:</strong> {currentRoom.players.length}명</div>
                                            <div><strong>상태:</strong> <span className={`room-status ${currentRoom.status}`}>{currentRoom.status}</span></div>
                                        </div>
                                        <button
                                            onClick={leaveRoom}
                                            className="btn btn-danger"
                                        >
                                            방 나가기
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 방 목록 */}
                            <div className="room-list">
                                <h3>📋 방 목록 ({rooms.length}개)</h3>
                                <div className="rooms-container">
                                    {rooms.length === 0 ? (
                                        <div className="empty-message">방이 없습니다</div>
                                    ) : (
                                        rooms.map((room) => (
                                            <div key={room.roomId} className="room-item">
                                                <div className="room-item-info">
                                                    <div className="room-name">{room.roomName}</div>
                                                    <div className="room-meta">
                                                        {room.playerCount}/{room.maxPlayers}명 • {room.status}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => joinRoom(room.roomId)}
                                                    disabled={!user || currentRoom !== null || room.playerCount >= room.maxPlayers}
                                                    className="btn btn-small btn-primary"
                                                >
                                                    {room.playerCount >= room.maxPlayers ? '가득참' : '참여'}
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 채팅 */}
                    <div className="chat-section">
                        <div className="status-card">
                            <h2>💬 채팅</h2>

                            {currentRoom ? (
                                <>
                                    {/* 플레이어 목록 */}
                                    <div className="players-section">
                                        <h3>👥 플레이어 ({currentRoom.players.length}명)</h3>
                                        <div className="players-list">
                                            {currentRoom.players.map((player) => (
                                                <span key={player.id} className="player-tag">
                                                    {player.username}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 채팅 메시지 */}
                                    <div className="chat-container">
                                        <div ref={chatContainerRef} className="chat-messages">
                                            {chatHistory.length === 0 ? (
                                                <div className="empty-message">채팅 메시지가 없습니다</div>
                                            ) : (
                                                chatHistory.map((msg) => (
                                                    <div key={msg.id} className="chat-message">
                                                        <span className="chat-username">{msg.username}:</span>
                                                        <span className="chat-text">{msg.message}</span>
                                                        <span className="chat-time">
                                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* 채팅 입력 */}
                                        <div className="chat-input-group">
                                            <input
                                                type="text"
                                                value={chatMessage}
                                                onChange={(e) => setChatMessage(e.target.value)}
                                                onKeyPress={handleChatKeyPress}
                                                placeholder="메시지 입력..."
                                                className="game-input"
                                            />
                                            <button
                                                onClick={sendChatMessage}
                                                disabled={!chatMessage.trim()}
                                                className="btn btn-primary"
                                            >
                                                전송
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-icon">🏠</div>
                                    <p>방에 참여하면 채팅을 사용할 수 있습니다</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 로그 섹션 */}
                <div className="logs-grid">
                    {/* 일반 로그 */}
                    <div className="log-section">
                        <div className="status-card">
                            <h2>📝 로그</h2>
                            <div ref={logsContainerRef} className="log-container">
                                {logs.length === 0 ? (
                                    <div className="empty-message">로그가 없습니다</div>
                                ) : (
                                    logs.map((log, index) => (
                                        <div key={index} className="log-entry">{log}</div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 에러 로그 */}
                    <div className="error-section">
                        <div className="status-card">
                            <h2>⚠️ 에러</h2>
                            <div className="error-container">
                                {errors.length === 0 ? (
                                    <div className="empty-message">에러가 없습니다</div>
                                ) : (
                                    errors.map((error, index) => (
                                        <div key={index} className="error-entry">{error}</div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 도움말 */}
                <div className="help-section">
                    <div className="status-card">
                        <h2>💡 사용 방법</h2>
                        <div className="help-content">
                            <div className="help-steps">
                                <div className="help-step">
                                    <span className="step-number">1</span>
                                    <span>먼저 <strong>"연결"</strong> 버튼을 클릭하여 서버에 연결하세요</span>
                                </div>
                                <div className="help-step">
                                    <span className="step-number">2</span>
                                    <span>사용자명을 입력하고 <strong>"등록"</strong>을 클릭하세요</span>
                                </div>
                                <div className="help-step">
                                    <span className="step-number">3</span>
                                    <span><strong>"새 방 만들기"</strong>로 방을 생성하거나 기존 방에 참여하세요</span>
                                </div>
                                <div className="help-step">
                                    <span className="step-number">4</span>
                                    <span>방에 입장하면 다른 플레이어들과 실시간 채팅이 가능합니다</span>
                                </div>
                                <div className="help-step">
                                    <span className="step-number">5</span>
                                    <span>하단의 로그에서 모든 활동이 기록됩니다</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameTest;