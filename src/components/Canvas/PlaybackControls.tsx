// ============================================================================
// PlaybackControls - Play/Pause, Frame Scrubber, Timecode & Aspect Selector
// ============================================================================

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Smartphone,
  Monitor,
  Square,
  Maximize,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { AspectRatio } from '../../types/editor';

function formatTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

export const PlaybackControls: React.FC = () => {
  const {
    currentTime,
    isPlaying,
    togglePlayPause,
    setCurrentTime,
    project,
    setAspectRatio,
  } = useEditorStore();

  const handleStepBack = () => {
    setCurrentTime(Math.max(0, currentTime - 1 / 30));
  };

  const handleStepForward = () => {
    setCurrentTime(
      Math.min(project.settings.duration, currentTime + 1 / 30)
    );
  };

  const handleReset = () => {
    setCurrentTime(0);
  };

  const aspectRatios: { id: AspectRatio; label: string; icon: any }[] = [
    { id: 'auto', label: 'Original (Medida del video/imagen)', icon: Maximize },
    { id: '9:16', label: '9:16 (TikTok/Reels)', icon: Smartphone },
    { id: '16:9', label: '16:9 (YouTube)', icon: Monitor },
    { id: '1:1', label: '1:1 (Cuadrado)', icon: Square },
    { id: '4:5', label: '4:5 (Post IG)', icon: Smartphone },
    { id: '21:9', label: '21:9 (Cine)', icon: Monitor },
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-4 bg-slate-900/90 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 shadow-xl">
      {/* Rewind */}
      <button
        onClick={handleReset}
        className="p-1.5 text-slate-400 hover:text-white transition-colors"
        title="Volver al inicio"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* Step Back 1 Frame */}
      <button
        onClick={handleStepBack}
        className="p-1.5 text-slate-300 hover:text-white transition-colors"
        title="Retroceder 1 fotograma"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* Play / Pause Primary Button */}
      <button
        onClick={togglePlayPause}
        className="p-2 sm:p-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md active:scale-95 transition-all"
        title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
        ) : (
          <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Step Forward 1 Frame */}
      <button
        onClick={handleStepForward}
        className="p-1.5 text-slate-300 hover:text-white transition-colors"
        title="Avanzar 1 fotograma"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* Timecode display */}
      <div className="flex items-center font-mono text-xs sm:text-sm text-slate-200 px-2 select-text border-l border-white/10">
        <span className="text-indigo-400 font-semibold">
          {formatTimecode(currentTime)}
        </span>
        <span className="text-slate-500 mx-1">/</span>
        <span className="text-slate-400">
          {formatTimecode(project.settings.duration)}
        </span>
      </div>

      {/* Aspect Ratio Picker */}
      <div className="hidden sm:flex items-center gap-1 border-l border-white/10 pl-2">
        {aspectRatios.map((item) => (
          <button
            key={item.id}
            onClick={() => setAspectRatio(item.id)}
            className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${
              project.settings.aspectRatio === item.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title={item.label}
          >
            {item.id === 'auto' ? 'Original' : item.id}
          </button>
        ))}
      </div>
    </div>
  );
};
