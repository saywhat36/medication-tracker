import { useEffect, useRef, useState, type PointerEvent } from 'react';

interface Props {
  value: string | undefined; // existing drawing, as a PNG data URL
  disabled: boolean;
  onSave: (dataUrl: string | undefined) => void;
}

const SIZE = 120;

// A small freehand canvas for doodling directly on a pill. Loads any
// existing drawing on mount, tracks strokes with pointer events (so it
// works with mouse, touch, and pen alike), and exports to a PNG data URL —
// the same format Bottle.tsx renders back onto the shelf pill.
export function PillDrawingCanvas({ value, disabled, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(value != null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (!value) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, SIZE, SIZE);
    img.src = value;
  }, [value]);

  function pointFromEvent(e: PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointFromEvent(e);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3B2A1A';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStrokes(true);
  }

  function stopDrawing() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) onSave(canvas.toDataURL('image/png'));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    setHasStrokes(false);
    onSave(undefined);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="touch-none rounded-full border border-apothecary-parchment-edge bg-white"
        style={{ cursor: disabled ? 'default' : 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
      <p className="text-xs text-apothecary-ink-faded">draw on the pill with your mouse or finger</p>
      {hasStrokes && (
        <button
          type="button"
          disabled={disabled}
          onClick={clear}
          className="font-hand text-sm text-apothecary-ink-faded underline decoration-dotted underline-offset-4 hover:text-apothecary-ink disabled:opacity-50"
        >
          clear drawing
        </button>
      )}
    </div>
  );
}
