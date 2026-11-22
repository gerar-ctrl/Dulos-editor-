// ============================================================================
// Playhead - High Precision Playhead with Grab Handle (Mobile & Desktop)
// ============================================================================

import React, { useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '../../store/useEditorStore';

interface PlayheadProps {
  pixelsPerSecond: number;
  totalDuration: number;
}

export const Playhead: React.FC<PlayheadProps> = ({
  pixelsPerSecond,
  totalDuration,
}) => {
  const { currentTime, setCurrentTime } = useEditorStore(
    useShallow((s) => ({
      currentTime: s.currentTime,
      setCurrentTime: s.setCurrentTime,
    }))
  );
  const [isDragging, setIsDragging] = useState(false);
  const playheadRef = useRef<HTMLDivElement | null>(null);

  const leftPosition = currentTime * pixelsPerSecond;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const bodyElement = playheadRef.current?.parentElement;
    if (!bodyElement) return;

    const rect = bodyElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(totalDuration, offsetX / pixelsPerSecond));
    setCurrentTime(newTime);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={playheadRef}
      style={{
        left: `${leftPosition}px`,
      }}
      className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-30 pointer-events-none transition-none shadow-[0_0_8px_rgba(244,63,94,0.8)]"
    >
      {/* Top Handle Arrow / Needle - Big comfortable touch target */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-auto absolute top-1 sm:top-0.5 -left-[11px] sm:-left-[9px] w-6 h-6 sm:w-5 sm:h-5 bg-rose-500 rounded-sm cursor-ew-resize flex items-center justify-center shadow-xl active:scale-125 transition-transform touch-none"
      >
        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-inner" />
      </div>
    </div>
  );
};
