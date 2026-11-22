// ============================================================================
// HorizontalScrollRow.tsx - Compact Horizontal Carousel for Tool Options
// ============================================================================

import React, { useRef } from 'react';

interface HorizontalScrollRowProps {
  children: React.ReactNode;
  className?: string;
}

export const HorizontalScrollRow: React.FC<HorizontalScrollRowProps> = ({
  children,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  };

  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      className={`flex flex-nowrap items-stretch gap-2 overflow-x-auto pb-1.5 snap-x ${className}`}
    >
      {children}
    </div>
  );
};
