// ============================================================================
// TimelineToolbar - Split, Delete, Duplicate, Freeze, Reverse, Detach Audio
// ============================================================================

import React from 'react';
import {
  Trash2,
  Copy,
  Snowflake,
  RotateCcw,
  Volume2,
  PlusCircle,
  Gauge,
  ArrowLeftRight,
} from 'lucide-react';
import {
  SplitBracketIcon,
  TrimLeftBracketIcon,
  TrimRightBracketIcon,
  PipOverlayIcon,
} from './CutIcons';
import { useEditorStore } from '../../store/useEditorStore';

export const TimelineToolbar: React.FC = () => {
  const {
    selectedClipId,
    splitClip,
    trimLeftClip,
    trimRightClip,
    deleteClip,
    duplicateClip,
    freezeFrame,
    reverseClip,
    separateAudio,
    setIsMediaDrawerOpen,
    setActiveInspectorTab,
    setReorderTrackId,
    project,
  } = useEditorStore();

  const selectedClip = selectedClipId
    ? project.tracks
        .flatMap((t) => t.clips)
        .find((c) => c.id === selectedClipId)
    : null;

  const isVideo = selectedClip?.type === 'video';
  const reorderableTrack =
    (selectedClip
      ? project.tracks.find((t) => t.id === selectedClip.trackId)
      : null) || project.tracks.find((t) => t.clips.length > 1);
  const canReorder = Boolean(reorderableTrack && reorderableTrack.clips.length > 1);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#12131b] border-t border-b border-white/10 select-none overflow-x-auto text-xs no-scrollbar">
      {/* Left: Action Operations */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Split Button */}
        <button
          onClick={() => selectedClipId && splitClip(selectedClipId)}
          disabled={!selectedClipId}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium text-slate-200 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Dividir clip en el cabezal (Split)"
        >
          <SplitBracketIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Dividir</span>
        </button>

        {/* Trim Left Button */}
        <button
          onClick={() => selectedClipId && trimLeftClip(selectedClipId)}
          disabled={!selectedClipId}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium text-slate-200 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Recortar izquierda hasta el cabezal (Q)"
        >
          <TrimLeftBracketIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Recortar Izq.</span>
        </button>

        {/* Trim Right Button */}
        <button
          onClick={() => selectedClipId && trimRightClip(selectedClipId)}
          disabled={!selectedClipId}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium text-slate-200 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Recortar derecha desde el cabezal (W)"
        >
          <TrimRightBracketIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Recortar Der.</span>
        </button>

        {/* Delete Button */}
        <button
          onClick={() => selectedClipId && deleteClip(selectedClipId)}
          disabled={!selectedClipId}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium text-slate-200 hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Eliminar clip seleccionado (Delete)"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span>Eliminar</span>
        </button>

        {/* Duplicate Button */}
        <button
          onClick={() => selectedClipId && duplicateClip(selectedClipId)}
          disabled={!selectedClipId}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium text-slate-200 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Duplicar clip"
        >
          <Copy className="w-3.5 h-3.5 text-emerald-400" />
          <span>Duplicar</span>
        </button>

        {/* Freeze Frame */}
        {isVideo && (
          <button
            onClick={() => selectedClipId && freezeFrame(selectedClipId)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium text-slate-200 hover:bg-white/10 transition-colors"
            title="Congelar fotograma (Freeze frame)"
          >
            <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
            <span>Congelar</span>
          </button>
        )}

        {/* Reverse Clip */}
        {(isVideo || selectedClip?.type === 'audio') && (
          <button
            onClick={() => selectedClipId && reverseClip(selectedClipId)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              selectedClip?.isReversed
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-slate-200 hover:bg-white/10'
            }`}
            title="Reproducir en reversa (audio y video)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reversa</span>
          </button>
        )}

        {/* Separate Audio from Video */}
        {isVideo && (
          <button
            onClick={() => selectedClipId && separateAudio(selectedClipId)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium text-slate-200 hover:bg-white/10 transition-colors"
            title="Separar audio en una pista independiente"
          >
            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Separar Audio</span>
          </button>
        )}

        {/* Speed button */}
        {selectedClip && (
          <button
            onClick={() => setActiveInspectorTab('speed')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium text-slate-200 hover:bg-white/10 transition-colors"
            title="Control de velocidad lineal"
          >
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span>Velocidad</span>
          </button>
        )}

        {/* Instant Reorder button */}
        {canReorder && reorderableTrack && (
          <button
            onClick={() => setReorderTrackId(reorderableTrack.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium text-orange-300 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 transition-colors"
            title="Reordenar clips de la pista al instante"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-orange-400" />
            <span>Ordenar</span>
          </button>
        )}
      </div>

      {/* Right: Add Media / PIP */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsMediaDrawerOpen(true, 'pip')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-semibold text-orange-300 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 transition-all"
          title="Agregar video, imagen o material superpuesto (PIP)"
        >
          <PipOverlayIcon className="w-3.5 h-3.5 text-orange-400" />
          <span>PIP</span>
        </button>
        <button
          onClick={() => setIsMediaDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Agregar Medios</span>
        </button>
      </div>
    </div>
  );
};
