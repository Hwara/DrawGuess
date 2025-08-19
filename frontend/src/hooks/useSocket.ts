// src/hooks/useSocket.ts
import { useEffect, useState, useRef } from 'react';
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
    drawingData: DrawingPoint[];
    chatHistory: ChatMessage[];
    createdAt: number;
}

interface DrawingPoint {
    type: 'line' | 'clear' | 'undo';
    x?: number;
    y?: number;
    prevX?: number;
    prevY?: number;
    color?: string;
    lineWidth?: number;
    userId: string;
    timestamp: number;
}

interface ChatMessage {
    id: number;
    userId: string;
    username: string;
    message: string;
    timestamp: number;
    isAnswer: boolean;
}

interface RoomListItem {
    roomId: string;
    roomName: string;
    playerCount: number;
    maxPlayers: number;
    status: 'waiting' | 'playing' | 'finished';
    createdAt: number;
}

interface UseSocketReturn {
    socket: Socket | null;
    connected: boolean;
    user: User | null;
    currentRoom: GameState | null;
    rooms: RoomListItem[];
    error: string | null;
    // Actions
    register: (username: string) => void;
    createRoom: (roomName?: string) => void;
    joinRoom: (roomId: string) => void;
    leaveRoom: () => void;
    startGame: () => void;
    sendChatMessage: (message: string) => void;
    sendDrawing: (drawingPoint: Omit<DrawingPoint, 'userId' | 'timestamp'>) => void;
    clearCanvas: () => void;
    // Drawing handlers
    setDrawingHandlers: (handlers: {
        onDrawing?: (point: DrawingPoint) => void;
        onCanvasCleared?: (data: { roomId: string; userId: string }) => void;
        onDrawingHistory?: (history: DrawingPoint[]) => void;
    }) => void;
    // Game callbacks
    setGameCallbacks: (callbacks: {
        onCorrectAnswer?: (data: { userId: string; username: string; word: string; score: number }) => void;
        onGameFinished?: (finalScores: any[]) => void;
    }) => void;
}

// 개발 환경에서도 프로덕션 API 사용 (가장 안전한 방법)
const SOCKET_URL = 'https://api.hwara-dev.kr';

export const useSocket = (): UseSocketReturn => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [currentRoom, setCurrentRoom] = useState<GameState | null>(null);
    const [rooms, setRooms] = useState<RoomListItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Drawing 관련 이벤트 핸들러들을 위한 ref
    const drawingHandlersRef = useRef<{
        onDrawing?: (point: DrawingPoint) => void;
        onCanvasCleared?: (data: { roomId: string; userId: string }) => void;
        onDrawingHistory?: (history: DrawingPoint[]) => void;
    }>({});

    // 게임 이벤트 콜백들을 위한 ref
    const callbacksRef = useRef<{
        onCorrectAnswer?: (data: { userId: string; username: string; word: string; score: number }) => void;
        onGameFinished?: (finalScores: any[]) => void;
    }>({});

    useEffect(() => {
        // Socket 연결
        const newSocket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true
        });

        setSocket(newSocket);

        // 연결 이벤트
        newSocket.on('connect', () => {
            console.log('🔌 Socket 연결됨:', newSocket.id);
            setConnected(true);
            setError(null);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('🔌 Socket 연결 해제:', reason);
            setConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('🔌 Socket 연결 오류:', error);
            setError('서버 연결에 실패했습니다.');
        });

        // 게임 이벤트
        newSocket.on('registered', (userData: User) => {
            console.log('👤 사용자 등록됨:', userData);
            setUser(userData);
            setError(null);
        });

        newSocket.on('room-list', (roomList: RoomListItem[]) => {
            console.log('🏠 방 목록 수신:', roomList);
            setRooms(roomList);
        });

        newSocket.on('room-created', (gameState: GameState) => {
            console.log('🏠 방 생성됨:', gameState);
            setCurrentRoom(gameState);
        });

        newSocket.on('joined-room', (gameState: GameState) => {
            console.log('🏠 방 참여됨:', gameState);
            setCurrentRoom(gameState);
        });

        newSocket.on('left-room', (data: { roomId: string }) => {
            console.log('🚪 방 나감:', data);
            setCurrentRoom(null);
        });

        newSocket.on('room-updated', (gameState: GameState) => {
            console.log('🔄 방 상태 업데이트:', gameState);
            setCurrentRoom(gameState);
        });

        newSocket.on('room-list-updated', (roomInfo: RoomListItem) => {
            console.log('📋 방 목록 업데이트:', roomInfo);
            setRooms(prev => {
                const index = prev.findIndex(room => room.roomId === roomInfo.roomId);
                if (index >= 0) {
                    const newRooms = [...prev];
                    newRooms[index] = roomInfo;
                    return newRooms;
                } else {
                    return [...prev, roomInfo];
                }
            });
        });

        newSocket.on('room-deleted', (data: { roomId: string }) => {
            console.log('🗑️ 방 삭제됨:', data);
            setRooms(prev => prev.filter(room => room.roomId !== data.roomId));
        });

        newSocket.on('game-started', (gameState: GameState) => {
            console.log('🎮 게임 시작됨:', gameState);
            setCurrentRoom(gameState);
        });

        newSocket.on('round-ended', (gameState: GameState) => {
            console.log('🏁 라운드 종료:', gameState);
            setCurrentRoom(gameState);
        });

        newSocket.on('game-finished', (data: { finalScores: any[]; gameState: GameState }) => {
            console.log('🏆 게임 완전 종료:', data);
            setCurrentRoom(data.gameState);
            // 게임 종료 콜백 호출
            if (callbacksRef.current.onGameFinished) {
                callbacksRef.current.onGameFinished(data.finalScores);
            }
        });

        newSocket.on('chat-message', (message: ChatMessage) => {
            console.log('💬 채팅 메시지:', message);
            setCurrentRoom(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    chatHistory: [...prev.chatHistory, message]
                };
            });
        });

        newSocket.on('correct-answer', (data: { userId: string; username: string; word: string; score: number }) => {
            console.log('🎯 정답 맞춤:', data);
            // 정답 알림은 상위 컴포넌트에서 처리하도록 콜백으로 전달
            if (callbacksRef.current.onCorrectAnswer) {
                callbacksRef.current.onCorrectAnswer(data);
            }
        });

        // 그리기 이벤트들
        newSocket.on('drawing', (drawingPoint: DrawingPoint) => {
            console.log('🎨 그림 데이터 수신:', drawingPoint);
            if (drawingHandlersRef.current.onDrawing) {
                drawingHandlersRef.current.onDrawing(drawingPoint);
            }
        });

        newSocket.on('canvas-cleared', (data: { roomId: string; userId: string }) => {
            console.log('🧹 캔버스 지워짐:', data);
            if (drawingHandlersRef.current.onCanvasCleared) {
                drawingHandlersRef.current.onCanvasCleared(data);
            }
        });

        newSocket.on('drawing-history', (history: DrawingPoint[]) => {
            console.log('📖 그림 히스토리 수신:', history.length, '개');
            if (drawingHandlersRef.current.onDrawingHistory) {
                drawingHandlersRef.current.onDrawingHistory(history);
            }
        });

        // 에러 이벤트
        newSocket.on('error', (errorData: { message: string }) => {
            console.error('❌ Socket 에러:', errorData);
            setError(errorData.message);
        });

        return () => {
            newSocket.close();
        };
    }, []);

    // Actions
    const register = (username: string) => {
        if (socket) {
            socket.emit('register', { username });
        }
    };

    const createRoom = (roomName?: string) => {
        if (socket) {
            socket.emit('create-room', { name: roomName });
        }
    };

    const joinRoom = (roomId: string) => {
        if (socket) {
            socket.emit('join-room', { roomId });
        }
    };

    const leaveRoom = () => {
        if (socket && currentRoom) {
            socket.emit('leave-room', { roomId: currentRoom.roomId });
        }
    };

    const startGame = () => {
        if (socket && currentRoom) {
            socket.emit('start-game', { roomId: currentRoom.roomId });
        }
    };

    const sendChatMessage = (message: string) => {
        if (socket && currentRoom) {
            socket.emit('chat-message', { roomId: currentRoom.roomId, message });
        }
    };

    const sendDrawing = (drawingPoint: Omit<DrawingPoint, 'userId' | 'timestamp'>) => {
        if (socket && currentRoom) {
            socket.emit('drawing', {
                roomId: currentRoom.roomId,
                ...drawingPoint
            });
        }
    };

    const clearCanvas = () => {
        if (socket && currentRoom) {
            socket.emit('clear-canvas', { roomId: currentRoom.roomId });
        }
    };

    // Drawing 이벤트 핸들러 등록 함수들
    const setDrawingHandlers = (handlers: {
        onDrawing?: (point: DrawingPoint) => void;
        onCanvasCleared?: (data: { roomId: string; userId: string }) => void;
        onDrawingHistory?: (history: DrawingPoint[]) => void;
    }) => {
        drawingHandlersRef.current = handlers;
    };

    // 게임 이벤트 콜백 등록 함수
    const setGameCallbacks = (callbacks: {
        onCorrectAnswer?: (data: { userId: string; username: string; word: string; score: number }) => void;
        onGameFinished?: (finalScores: any[]) => void;
    }) => {
        callbacksRef.current = callbacks;
    };

    return {
        socket,
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
    };
};

export type {
    User,
    Player,
    GameState,
    DrawingPoint,
    ChatMessage,
    RoomListItem,
    UseSocketReturn
};