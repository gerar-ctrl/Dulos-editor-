// ============================================================================
// SpeedTab - Linear Speed (0.02x to 10x), Split-Safe Duration Sync,
// and Live Section Preview
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { VideoClip } from '../../../types/editor';
import { useEditorStore } from '../../../store/useEditorStore';
import {
  Gauge,
  Play,
  Pause,
  RotateCcw,
  Minus,
  Plus,
} from 'lucide-react';

interface SpeedTabProps {
  clip: VideoClip;
}

const MIN_SPEED = 0.02;
const MAX_SPEED = 10.0;
const SLIDER_MID = 500;
const SLIDER_MAX = 1000;

/**
 * Maps a linear slider position [0..1000] to speed [0.02x..10.0x]:
 * - [0..500]    -> slow motion [0.02x .. 1.00x] (50% of track for fine slow-mo control)
 * - [500..1000] -> fast motion [1.00x .. 10.0x]
 */
function sliderToSpeed(pos: number): number {
  const clamped = Math.max(0, Math.min(SLIDER_MAX, pos));
  if (clamped <= SLIDER_MID) {
    const t = clamped / SLIDER_MID; // 0..1
    // Gentle quadratic curve so 0.02x..0.30x has extra breathing room
    const speed = MIN_SPEED + (1.0 - MIN_SPEED) * Math.pow(t, 1.35);
    return Number(Math.max(MIN_SPEED, Math.min(1.0, speed)).toFixed(2));
  }
  const t = (clamped - SLIDER_MID) / (SLIDER_MAX - SLIDER_MID); // 0..1
  const speed = 1.0 + (MAX_SPEED - 1.0) * Math.pow(t, 1.4);
  const rounded = speed < 2 ? Math.round(speed * 20) / 20 : Math.round(speed * 10) / 10;
  return Number(Math.max(1.0, Math.min(MAX_SPEED, rounded)).toFixed(2));
}

function speedToSlider(speed: number): number {
  const s = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed || 1.0));
  if (s <= 1.0) {
    const norm = Math.max(0, Math.min(1, (s - MIN_SPEED) / (1.0 - MIN_SPEED)));
    return Math.round(Math.pow(norm, 1 / 1.35) * SLIDER_MID);
  }
  const norm = Math.max(0, Math.min(1, (s - 1.0) / (MAX_SPEED - 1.0)));
  return Math.round(SLIDER_MID + Math.pow(norm, 1 / 1.4) * (SLIDER_MAX - SLIDER_MID));
}

function formatSpeedLabel(speed: number): string {
  if (speed < 0.1) return `${speed.toFixed(2)}x`;
  if (Number.isInteger(speed)) return `${speed}.0x`;
  return `${Number(speed.toFixed(2))}x`;
}

function getSpeedBadge(speed: number): { label: string; colorClass: string } {
  if (speed <= 0.15) {
    return {
      label: 'Ultra lenta',
      colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    };
  }
  if (speed < 0.99) {
    return {
      label: 'Cámara lenta',
      colorClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    };
  }
  if (speed <= 1.01) {
    return {
      label: 'Normal',
      colorClass: 'bg-white/10 text-slate-300 border-white/15',
    };
  }
  if (speed >= 4.0) {
    return {
      label: 'Time-lapse',
      colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    };
  }
  return {
    label: 'Cámara rápida',
    colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  };
}

export const SpeedTab: React.FC<SpeedTabProps> = ({ clip }) => {
  const {
    updateClip,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
  } = useEditorStore(
    useShallow((s) => ({
      updateClip: s.updateClip,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
      currentTime: s.currentTime,
      setCurrentTime: s.setCurrentTime,
    }))
  );

  const [isLoopingSection, setIsLoopingSection] = useState(false);
  const startedPreviewRef = useRef(false);

  // Anchor the selected clip's OWN media segment length (duration * speed),
  // NEVER clip.sourceDuration, so split or trimmed clips only change speed
  // for their selected section and never pull back cut-off footage.
  const currentComputedMediaSpan = Math.max(
    0.05,
    clip.duration * (clip.speed || 1)
  );
  const maxAllowedSpan =
    clip.sourceDuration && clip.sourceDuration > 0
      ? Math.max(0.05, clip.sourceDuration - (clip.sourceStartTime || 0))
      : currentComputedMediaSpan;
  const clampedMediaSpan = Math.min(currentComputedMediaSpan, maxAllowedSpan);

  const segmentAnchorRef = useRef<{
    clipId: string;
    sourceStartTime: number;
    mediaLength: number;
    lastAppliedDuration: number;
    lastAppliedSpeed: number;
  }>({
    clipId: clip.id,
    sourceStartTime: clip.sourceStartTime || 0,
    mediaLength: clampedMediaSpan,
    lastAppliedDuration: clip.duration,
    lastAppliedSpeed: clip.speed || 1,
  });

  // Re-anchor if the user selected another clip or trimmed/split this clip externally
  if (
    segmentAnchorRef.current.clipId !== clip.id ||
    Math.abs(segmentAnchorRef.current.sourceStartTime - (clip.sourceStartTime || 0)) > 0.02 ||
    (Math.abs(segmentAnchorRef.current.lastAppliedDuration - clip.duration) > 0.03 &&
      Math.abs(segmentAnchorRef.current.lastAppliedSpeed - (clip.speed || 1)) < 0.005)
  ) {
    segmentAnchorRef.current = {
      clipId: clip.id,
      sourceStartTime: clip.sourceStartTime || 0,
      mediaLength: clampedMediaSpan,
      lastAppliedDuration: clip.duration,
      lastAppliedSpeed: clip.speed || 1,
    };
  }

  const segmentBaseMediaLength = segmentAnchorRef.current.mediaLength;

  // Keep section preview looped strictly inside the selected clip bounds
  useEffect(() => {
    if (!isLoopingSection || !isPlaying) return;
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + clip.duration;
    if (currentTime < clipStart - 0.02 || currentTime >= clipEnd - 0.03) {
      setCurrentTime(clipStart);
    }
  }, [
    isLoopingSection,
    isPlaying,
    currentTime,
    clip.startTime,
    clip.duration,
    setCurrentTime,
  ]);

  // If playback stops externally, turn off section loop indicator
  useEffect(() => {
    if (!isPlaying && isLoopingSection) {
      setIsLoopingSection(false);
    }
  }, [isPlaying, isLoopingSection]);

  // Pause preview cleanly when closing the Speed tab if we started it
  useEffect(() => {
    return () => {
      if (startedPreviewRef.current) {
        useEditorStore.getState().setIsPlaying(false);
        startedPreviewRef.current = false;
      }
    };
  }, []);

  const handleTogglePreview = () => {
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + clip.duration;

    if (isPlaying && isLoopingSection) {
      setIsPlaying(false);
      setIsLoopingSection(false);
      startedPreviewRef.current = false;
      return;
    }

    if (currentTime < clipStart || currentTime >= clipEnd - 0.05) {
      setCurrentTime(clipStart);
    }
    setIsLoopingSection(true);
    startedPreviewRef.current = true;
    setIsPlaying(true);
  };

  const handleRestartPreview = () => {
    setCurrentTime(clip.startTime);
    setIsLoopingSection(true);
    startedPreviewRef.current = true;
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    const safeSpeed = Math.max(
      MIN_SPEED,
      Math.min(MAX_SPEED, Number(newSpeed.toFixed(2)))
    );
    const baseMediaLength = Math.max(0.05, segmentAnchorRef.current.mediaLength);
    const newDuration = Number(
      Math.max(0.1, baseMediaLength / safeSpeed).toFixed(2)
    );

    segmentAnchorRef.current.lastAppliedDuration = newDuration;
    segmentAnchorRef.current.lastAppliedSpeed = safeSpeed;

    updateClip(clip.id, {
      speed: safeSpeed,
      duration: newDuration,
      speedCurve: undefined,
    });

    // Keep playhead inside the selected clip and auto-preview the new speed live
    const clipStart = clip.startTime;
    const oldDuration = Math.max(0.05, clip.duration);
    const newEnd = clipStart + newDuration;
    if (currentTime < clipStart || currentTime >= clipStart + oldDuration - 0.02) {
      setCurrentTime(clipStart);
    } else {
      const progress = Math.max(0, Math.min(0.98, (currentTime - clipStart) / oldDuration));
      const mappedTime = Math.max(clipStart, Math.min(newEnd - 0.02, clipStart + progress * newDuration));
      if (Math.abs(mappedTime - currentTime) > 0.02) {
        setCurrentTime(Number(mappedTime.toFixed(2)));
      }
    }

    setIsLoopingSection(true);
    startedPreviewRef.current = true;
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const handleNudgeSpeed = (direction: -1 | 1) => {
    const current = clip.speed || 1;
    const step = current < 0.2 ? 0.01 : current < 1.0 ? 0.05 : current < 2.0 ? 0.1 : 0.25;
    const next =
      direction < 0 && Math.abs(current - 1.0) < 0.001
        ? 0.95
        : current + direction * step;
    handleSpeedChange(next);
  };

  const currentSpeed = clip.speed || 1.0;
  const sliderVal = speedToSlider(currentSpeed);
  const badge = getSpeedBadge(currentSpeed);

  const localPlayTime = Math.max(
    0,
    Math.min(clip.duration, currentTime - clip.startTime)
  );
  const previewProgressPct =
    clip.duration > 0 ? Math.max(0, Math.min(100, (localPlayTime / clip.duration) * 100)) : 0;

  return (
    <div className="space-y-4 p-4 text-xs text-slate-300">
      {/* Live Section Preview Card */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/60 to-slate-900/80 border border-indigo-500/25 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-100 truncate">
                Previsualizar sección
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.colorClass}`}
              >
                {badge.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Segmento: {segmentBaseMediaLength.toFixed(1)}s →{' '}
              <span className="text-indigo-300 font-bold">
                {clip.duration.toFixed(1)}s
              </span>{' '}
              ({formatSpeedLabel(currentSpeed)})
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleRestartPreview}
              title="Reproducir sección desde el inicio"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleTogglePreview}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs shadow transition-all active:scale-95 ${
                isPlaying && isLoopingSection
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isPlaying && isLoopingSection ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Previsualizar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Section Progress Bar */}
        <div className="space-y-1">
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width))
              );
              setCurrentTime(Number((clip.startTime + ratio * clip.duration).toFixed(2)));
            }}
            className="w-full h-2 rounded-full bg-white/10 overflow-hidden cursor-pointer relative"
            title="Toca para saltar dentro de esta sección"
          >
            <div
              style={{ width: `${previewProgressPct}%` }}
              className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 transition-[width] duration-75"
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>{localPlayTime.toFixed(1)}s</span>
            <span>
              {isPlaying && isLoopingSection
                ? 'Reproduciendo sección en bucle...'
                : 'Solo se reproduce el clip seleccionado'}
            </span>
            <span>{clip.duration.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* Linear Speed Section with Dual-Scale Precision Slider */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center text-slate-200 font-semibold">
          <span className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-indigo-400" />
            Velocidad Lineal
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleNudgeSpeed(-1)}
              className="p-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-colors"
              title="Reducir velocidad"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono text-indigo-300 font-bold text-sm min-w-[54px] text-center">
              {formatSpeedLabel(currentSpeed)}
            </span>
            <button
              type="button"
              onClick={() => handleNudgeSpeed(1)}
              className="p-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-colors"
              title="Aumentar velocidad"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="relative flex items-center">
            {/* Center 1.0x notch */}
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-0.5 h-3.5 bg-white/40 rounded-full"
              aria-hidden="true"
            />
            <input
              type="range"
              min={0}
              max={SLIDER_MAX}
              step={1}
              value={sliderVal}
              onChange={(e) => handleSpeedChange(sliderToSpeed(Number(e.target.value)))}
              className="w-full accent-indigo-500 cursor-pointer relative z-10"
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span className="text-cyan-300">0.02x (Ultra lenta)</span>
            <button
              type="button"
              onClick={() => handleSpeedChange(1.0)}
              className="text-slate-300 hover:text-white underline-offset-2 hover:underline"
            >
              1.0x Normal
            </button>
            <span className="text-indigo-300">10x (Rápida)</span>
          </div>
        </div>

        {/* Preserve Voice Pitch Toggle */}
        <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer select-none">
          <div className="min-w-0">
            <div className="text-slate-200 font-semibold text-xs">
              Mantener tono de voz original
            </div>
            <div className="text-[10px] text-slate-400">
              {(clip.audio?.preservesPitch ?? true)
                ? 'Conserva el tono natural al cambiar la velocidad (igual al exportar)'
                : 'Altera el tono según la velocidad (más grave lento, más agudo rápido)'}
            </div>
          </div>
          <input
            type="checkbox"
            checked={clip.audio?.preservesPitch ?? true}
            onChange={(e) =>
              updateClip(clip.id, {
                audio: { ...clip.audio, preservesPitch: e.target.checked },
              })
            }
            className="w-4 h-4 accent-indigo-500 cursor-pointer shrink-0"
          />
        </label>
      </div>
    </div>
  );
};
