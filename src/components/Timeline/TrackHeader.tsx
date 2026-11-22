// ============================================================================
// TrackHeader - Lock, Mute, Visibility & Track Identification
// ============================================================================

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Track } from '../../types/editor';
import { useEditorStore } from '../../store/useEditorStore';
import {
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Video,
  Layers,
  Type,
  Music,
} from 'lucide-react';

interface TrackHeaderProps {
  track: Track;
}

export const TrackHeader: React.FC<TrackHeaderProps> = React.memo(({ track }) => {
  const {
    isTrackSelected,
    selectTrack,
    isVolumeVisible,
    toggleTrackVolumeLine,
    trackHeight,
  } = useEditorStore(
    useShallow((s) => ({
      isTrackSelected: s.selectedTrackId === track.id,
      selectTrack: s.selectTrack,
      isVolumeVisible: Boolean(s.visibleVolumeTracks[track.id]),
      toggleTrackVolumeLine: s.toggleTrackVolumeLine,
      trackHeight: s.trackHeight,
    }))
  );

  const hasVolumeKeyframes = (track.volumeKeyframes?.length ?? 0) > 0;
  const trackVolume = track.volume ?? 100;

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    const project = useEditorStore.getState().project;
    const tracks = project.tracks.map((t) =>
      t.id === track.id ? { ...t, isLocked: !t.isLocked } : t
    );
    useEditorStore.setState({ project: { ...project, tracks } });
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const project = useEditorStore.getState().project;
    const tracks = project.tracks.map((t) =>
      t.id === track.id ? { ...t, isMuted: !t.isMuted } : t
    );
    useEditorStore.setState({ project: { ...project, tracks } });
  };

  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    const project = useEditorStore.getState().project;
    const tracks = project.tracks.map((t) =>
      t.id === track.id ? { ...t, isVisible: !t.isVisible } : t
    );
    useEditorStore.setState({ project: { ...project, tracks } });
  };

  const getTrackIcon = () => {
    if (track.type === 'main-video') return <Video className="w-3.5 h-3.5 text-indigo-400" />;
    if (track.type === 'overlay-video') return <Layers className="w-3.5 h-3.5 text-pink-400" />;
    if (track.type === 'text') return <Type className="w-3.5 h-3.5 text-amber-400" />;
    return <Music className="w-3.5 h-3.5 text-emerald-400" />;
  };

  return (
    <div
      onClick={() => selectTrack(track.id)}
      title={`${track.name}${track.type !== 'text' ? ' · Clic para seleccionar (tecla V: línea de volumen)' : ''}`}
      style={{ height: `${trackHeight}px` }}
      className={`w-36 sm:w-44 flex items-center justify-between px-2 border-r border-b border-white/5 text-slate-300 shrink-0 cursor-pointer transition-colors ${
        isTrackSelected
          ? 'bg-indigo-500/15 border-l-2 border-l-indigo-400'
          : 'bg-[#10111a] hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {getTrackIcon()}
        <span className="text-xs font-medium truncate">{track.name}</span>
        {track.type !== 'text' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleTrackVolumeLine(track.id);
            }}
            className={`px-1 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 border transition-colors ${
              isVolumeVisible
                ? 'bg-sky-500/25 text-sky-300 border-sky-400/60'
                : hasVolumeKeyframes || trackVolume !== 100
                ? 'bg-sky-500/10 text-sky-200 border-sky-500/30 hover:text-white'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
            title="Herramienta V: Mostrar/ocultar línea de volumen sobre esta pista"
          >
            {hasVolumeKeyframes
              ? `V·${track.volumeKeyframes!.length}N`
              : trackVolume !== 100
              ? `V·${trackVolume}%`
              : 'V'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Visibility */}
        <button
          onClick={toggleVisibility}
          className="p-1 hover:text-white transition-colors"
          title={track.isVisible ? 'Ocultar pista' : 'Mostrar pista'}
        >
          {track.isVisible ? (
            <Eye className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-slate-600" />
          )}
        </button>

        {/* Mute */}
        <button
          onClick={toggleMute}
          className="p-1 hover:text-white transition-colors"
          title={track.isMuted ? 'Activar sonido' : 'Silenciar pista'}
        >
          {track.isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {/* Lock */}
        <button
          onClick={toggleLock}
          className="p-1 hover:text-white transition-colors"
          title={track.isLocked ? 'Desbloquear pista' : 'Bloquear pista'}
        >
          {track.isLocked ? (
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Unlock className="w-3.5 h-3.5 text-slate-600" />
          )}
        </button>
      </div>
    </div>
  );
});
