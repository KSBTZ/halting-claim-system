import { useEffect, useRef, useState } from 'react';
import { CircleCheck, Eraser, PenLine } from 'lucide-react';

const INK = '#0e3500';

/**
 * Draw-to-sign box for mouse, pen or finger.
 * Calls onChange with a PNG data URL after each stroke, or null once cleared.
 */
const SignaturePad = ({ onChange }) => {
  const canvasRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const hasInkRef = useRef(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Match the canvas to its on-screen size at device pixel ratio so strokes stay sharp.
  // Resizing wipes a canvas, so a width change (e.g. rotating a phone) clears the signature.
  useEffect(() => {
    const canvas = canvasRef.current;
    let width = 0;

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = INK;
      ctx.fillStyle = INK;
      hasInkRef.current = false;
    };

    fit();
    const observer = new ResizeObserver(() => {
      if (canvas.getBoundingClientRect().width === width) return;
      const hadInk = hasInkRef.current;
      fit();
      if (hadInk) {
        setSigned(false);
        onChangeRef.current?.(null);
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const pointFrom = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const point = pointFrom(e);
    lastPointRef.current = point;
    // A dot, so a single tap still leaves a mark
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const events = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];
    events.forEach((event) => {
      const point = pointFrom(event);
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      lastPointRef.current = point;
    });
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    hasInkRef.current = true;
    setSigned(true);

    // Export at 1x so the stored image stays small
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const out = document.createElement('canvas');
    out.width = Math.round(rect.width);
    out.height = Math.round(rect.height);
    out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height);
    onChangeRef.current?.(out.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    hasInkRef.current = false;
    setSigned(false);
    onChangeRef.current?.(null);
  };

  return (
    <div>
      <div className={`relative overflow-hidden rounded-xl border-2 bg-white transition-colors ${signed ? 'border-brand-600/40' : 'border-dashed border-gray-300'}`}>
        {!signed && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-gray-400">
            <PenLine className="h-4 w-4" />
            Sign here
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-6 bottom-10 border-b border-gray-200" />
        <canvas
          ref={canvasRef}
          aria-label="Signature pad: draw your signature with a mouse or finger"
          className="relative block h-44 w-full cursor-crosshair touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className={`flex items-center gap-1.5 text-xs font-medium ${signed ? 'text-brand-700' : 'text-gray-500'}`}>
          {signed ? <CircleCheck className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
          {signed ? 'Signed' : 'Use your mouse, or your finger on a phone.'}
        </p>
        <button type="button" onClick={clear} disabled={!signed} className="btn-ghost px-3 py-1.5 text-xs">
          <Eraser className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
