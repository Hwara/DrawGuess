// src/components/DrawingCanvas.tsx
import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { DrawingPoint } from '../hooks/useSocket';

interface DrawingCanvasProps {
    width?: number;
    height?: number;
    isDrawing: boolean; // 현재 사용자가 그릴 수 있는지
    onDrawing: (point: Omit<DrawingPoint, 'userId' | 'timestamp'>) => void;
    onClearCanvas: () => void;
    disabled?: boolean;
}

// ref로 외부에서 호출할 수 있는 메서드들
export interface DrawingCanvasRef {
    handleExternalDrawing: (point: DrawingPoint) => void;
    handleExternalCanvasClear: () => void;
    handleDrawingHistory: (history: DrawingPoint[]) => void;
}

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({
    width = 800,
    height = 600,
    isDrawing,
    onDrawing,
    onClearCanvas,
    disabled = false
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

    // 그리기 설정 (MVP 1단계: 고정값)
    const [drawingSettings] = useState({
        color: '#000000',
        lineWidth: 3,
        tool: 'pen' as const
    });

    // Canvas 초기화
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Canvas 기본 설정
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = drawingSettings.color;
        ctx.lineWidth = drawingSettings.lineWidth;

        // Canvas 배경을 흰색으로 초기화
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
    }, [width, height, drawingSettings]);

    // 좌표 정규화 함수 (Canvas 크기에 상대적인 좌표로 변환)
    const normalizeCoordinates = useCallback((clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }, []);

    // Canvas에 선 그리기
    const drawLine = useCallback((fromX: number, fromY: number, toX: number, toY: number, color: string = drawingSettings.color, lineWidth: number = drawingSettings.lineWidth) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
    }, [drawingSettings]);

    // Canvas 전체 지우기
    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
    }, [width, height]);

    // 다른 사용자의 그리기 수신
    const handleExternalDrawing = useCallback((point: DrawingPoint) => {
        if (point.type === 'line' && point.x !== undefined && point.y !== undefined && point.prevX !== undefined && point.prevY !== undefined) {
            drawLine(point.prevX, point.prevY, point.x, point.y, point.color || '#000000', point.lineWidth || 3);
        }
    }, [drawLine]);

    // 다른 사용자가 캔버스 지웠을 때
    const handleExternalCanvasClear = useCallback(() => {
        clearCanvas();
    }, [clearCanvas]);

    // 그림 히스토리 복원
    const handleDrawingHistory = useCallback((history: DrawingPoint[]) => {
        // 먼저 캔버스 지우기
        clearCanvas();

        // 히스토리 순서대로 그리기
        history.forEach(point => {
            if (point.type === 'clear') {
                clearCanvas();
            } else if (point.type === 'line' && point.x !== undefined && point.y !== undefined && point.prevX !== undefined && point.prevY !== undefined) {
                drawLine(point.prevX, point.prevY, point.x, point.y, point.color || '#000000', point.lineWidth || 3);
            }
        });

        console.log('📖 그림 히스토리 복원 완료:', history.length, '개 포인트');
    }, [clearCanvas, drawLine]);

    // useImperativeHandle로 ref를 통해 외부에서 호출할 수 있는 메서드들 노출
    useImperativeHandle(ref, () => ({
        handleExternalDrawing,
        handleExternalCanvasClear,
        handleDrawingHistory
    }), [handleExternalDrawing, handleExternalCanvasClear, handleDrawingHistory]);

    // 마우스 다운 이벤트
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || disabled) return;

        const point = normalizeCoordinates(e.clientX, e.clientY);
        setIsMouseDown(true);
        setLastPoint(point);

        console.log('🖱️ 마우스 다운:', point);
    }, [isDrawing, disabled, normalizeCoordinates]);

    // 마우스 무브 이벤트
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || disabled || !isMouseDown || !lastPoint) return;

        const currentPoint = normalizeCoordinates(e.clientX, e.clientY);

        // 로컬 Canvas에 즉시 그리기
        drawLine(lastPoint.x, lastPoint.y, currentPoint.x, currentPoint.y);

        // Socket으로 전송
        const drawingPoint: Omit<DrawingPoint, 'userId' | 'timestamp'> = {
            type: 'line',
            x: currentPoint.x,
            y: currentPoint.y,
            prevX: lastPoint.x,
            prevY: lastPoint.y,
            color: drawingSettings.color,
            lineWidth: drawingSettings.lineWidth
        };

        onDrawing(drawingPoint);
        setLastPoint(currentPoint);

    }, [isDrawing, disabled, isMouseDown, lastPoint, normalizeCoordinates, drawLine, onDrawing, drawingSettings]);

    // 마우스 업 이벤트
    const handleMouseUp = useCallback(() => {
        if (!isDrawing || disabled) return;

        setIsMouseDown(false);
        setLastPoint(null);

        console.log('🖱️ 마우스 업');
    }, [isDrawing, disabled]);

    // 마우스가 Canvas 밖으로 나갔을 때
    const handleMouseLeave = useCallback(() => {
        if (!isDrawing || disabled) return;

        setIsMouseDown(false);
        setLastPoint(null);

        console.log('🖱️ 마우스 리브');
    }, [isDrawing, disabled]);

    return (
        <div className="drawing-canvas-container">
            {/* 도구 바 (MVP 1단계: 지우기 버튼만) */}
            <div className="canvas-toolbar">
                <div className="canvas-info">
                    <span className={`drawing-status ${isDrawing ? 'can-draw' : 'cannot-draw'}`}>
                        {isDrawing ? '🎨 그리세요!' : '👀 다른 사람이 그리고 있어요'}
                    </span>
                </div>

                <div className="canvas-tools">
                    <button
                        className="tool-button clear-button"
                        onClick={onClearCanvas}
                        disabled={!isDrawing || disabled}
                        title="캔버스 지우기"
                    >
                        🧹 지우기
                    </button>
                </div>
            </div>

            {/* 메인 캔버스 */}
            <div className="canvas-wrapper">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className={`drawing-canvas ${!isDrawing ? 'readonly' : ''} ${disabled ? 'disabled' : ''}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        cursor: isDrawing && !disabled ? 'crosshair' : 'default'
                    }}
                />

                {/* 오버레이 완전 제거 - 툴바의 상태 메시지로 충분 */}
            </div>

            {/* 캔버스 정보 */}
            <div className="canvas-info-bar">
                <span>크기: {width} × {height}</span>
                <span>도구: 검은 펜 (굵기 {drawingSettings.lineWidth})</span>
            </div>
        </div>
    );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;