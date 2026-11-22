// ============================================================================
// PlaybackBar.tsx - Dedicated Scrubber & Transport Controls under Canvas
// ============================================================================

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Redo2,
  SkipForward,
  SkipBack,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { globalAudioEngine } from '../../core/audio/AudioEngine';
import { isAndroidNativeApp } from '../../core/native/androidBridge';

function formatTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
}

export const PlaybackBar: React.FC = () => {
  const {
    currentTime,
    isPlaying,
    togglePlayPause,
    setCurrentTime,
    projectDuration,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore(
    useShallow((s) => ({
      currentTime: s.currentTime,
      isPlaying: s.isPlaying,
      togglePlayPause: s.togglePlayPause,
      setCurrentTime: s.setCurrentTime,
      projectDuration: s.project.settings.duration,
      undo: s.undo,
      redo: s.redo,
      canUndo: s.canUndo,
      canRedo: s.canRedo,
    }))
  );

  const duration = Math.max(1, projectDuration);

  const handlePlayPause = () => {
    // Synchronously unlock Web Audio API on mobile user gesture
    globalAudioEngine.init();
    togglePlayPause();
  };

  const handleRewind = () => {
    setCurrentTime(0);
  };

  const handleStepBack = () => {
    setCurrentTime(Math.max(0, currentTime - 1 / 30));
  };

  const handleStepForward = () => {
    setCurrentTime(Math.min(duration, currentTime + 1 / 30));
  };

  const isAndroid = isAndroidNativeApp();

  return (
    <div
      className={`w-full bg-[#0c0d14] border-t border-b border-white/5 px-3 ${
        isAndroid ? 'py-1.5' : 'py-1.5 sm:py-0.5'
      } flex items-center justify-between select-none shrink-0 z-20`}
    >
      {/* Left: Timecode Current / Total */}
      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-300 leading-none">
        <span className="font-bold text-white text-[11px] sm:text-xs">
          {formatTimecode(currentTime)}
        </span>
        <span className="text-slate-500">/</span>
        <span className="text-slate-400 text-[10px] sm:text-[11px]">
          {formatTimecode(duration)}
        </span>
      </div>

      {/* Center: Transport Controls (Rewind, Play/Pause, Step) */}
      <div className={`flex items-center ${isAndroid ? 'gap-3' : 'gap-3 sm:gap-2.5'}`}>
        {/* Rewind */}
        <button
          onClick={handleRewind}
          className="p-0.5 text-slate-400 hover:text-white active:scale-95 transition-all"
          title="Volver al inicio"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* 1 Frame Back */}
        <button
          onClick={handleStepBack}
          className="p-0.5 text-slate-400 hover:text-white active:scale-95 transition-all hidden xs:block"
          title="Retroceder 1 fotograma"
        >
          <SkipBack className="w-3 h-3" />
        </button>

        {/* Primary Play / Pause Button */}
        <button
          onClick={handlePlayPause}
          className={`${
            isAndroid ? 'w-10 h-10' : 'w-10 h-10 sm:w-7 sm:h-7'
          } rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all`}
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? (
            <Pause
              className={`${
                isAndroid ? 'w-5 h-5' : 'w-5 h-5 sm:w-3.5 sm:h-3.5'
              } fill-current`}
            />
          ) : (
            <Play
              className={`${
                isAndroid ? 'w-5 h-5' : 'w-5 h-5 sm:w-3.5 sm:h-3.5'
              } fill-current ml-0.5`}
            />
          )}
        </button>

        {/* 1 Frame Forward */}
        <button
          onClick={handleStepForward}
          className="p-0.5 text-slate-400 hover:text-white active:scale-95 transition-all hidden xs:block"
          title="Avanzar 1 fotograma"
        >
          <SkipForward className="w-3 h-3" />
        </button>
      </div>

      {/* Right: Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-25 active:scale-95 transition-all"
          title="Deshacer"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={redo}
          disabled={!canRedo()}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-25 active:scale-95 transition-all"
          title="Rehacer"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
