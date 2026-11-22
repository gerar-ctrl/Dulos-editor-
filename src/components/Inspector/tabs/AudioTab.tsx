// ============================================================================
// AudioTab - 50 Voice Filters with Live Preview, Volume (0-1000%) & Fades
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { VideoClip, AudioClip, VoiceFilter } from '../../../types/editor';
import { useEditorStore } from '../../../store/useEditorStore';
import { globalAudioEngine } from '../../../core/audio/AudioEngine';
import {
  VOICE_FILTERS,
  VOICE_FILTER_CATEGORIES,
  VoiceFilterCategory,
  getVoiceFilterDefinition,
} from '../../../core/audio/voiceFilters';
import {
  Volume2,
  Activity,
  Mic,
  Download,
  Play,
  Square,
  Search,
  X,
  RotateCcw,
} from 'lucide-react';
import { HorizontalScrollRow } from '../../Editor/HorizontalScrollRow';

interface AudioTabProps {
  clip: VideoClip | AudioClip;
  volumeOnly?: boolean;
}

export const AudioTab: React.FC<AudioTabProps> = ({ clip, volumeOnly = false }) => {
  const { updateClip, showToast, setIsPlaying } = useEditorStore(
    useShallow((s) => ({
      updateClip: s.updateClip,
      showToast: s.showToast,
      setIsPlaying: s.setIsPlaying,
    }))
  );
  const audio = clip.audio;
  const [isDetectingBeats, setIsDetectingBeats] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Voice filter browsing & preview state
  const [selectedCategory, setSelectedCategory] = useState<VoiceFilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewingFilterId, setPreviewingFilterId] = useState<VoiceFilter | null>(null);

  useEffect(() => {
    return () => {
      globalAudioEngine.stopVoiceFilterPreview();
    };
  }, [clip.id]);

  const activeFilterDef = useMemo(
    () => getVoiceFilterDefinition(audio.voiceFilter),
    [audio.voiceFilter]
  );

  const normalizedActiveId: VoiceFilter =
    audio.voiceFilter === 'high' ? 'chipmunk' : audio.voiceFilter || 'none';

  const filteredVoiceFilters = useMemo(() => {
    const q = searchQuery
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return VOICE_FILTERS.filter((vf) => {
      if (selectedCategory !== 'all' && vf.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const hay = `${vf.label} ${vf.description}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return hay.includes(q);
    });
  }, [selectedCategory, searchQuery]);

  const handleUpdate = (partial: Partial<typeof audio>) => {
    updateClip(clip.id, { audio: { ...audio, ...partial } });
  };

  const stopPreview = () => {
    globalAudioEngine.stopVoiceFilterPreview();
    setIsPreviewing(false);
    setPreviewingFilterId(null);
  };

  const runPreview = async (filterId: VoiceFilter) => {
    globalAudioEngine.init();
    const state = useEditorStore.getState();
    if (state.isPlaying) {
      setIsPlaying(false);
    }

    setPreviewingFilterId(filterId);
    const started = await globalAudioEngine.previewVoiceFilter(
      clip,
      filterId,
      state.currentTime,
      (playing) => {
        setIsPreviewing(playing);
        if (!playing) {
          setPreviewingFilterId(null);
        }
      }
    );

    if (!started) {
      // Fallback: play directly on the timeline so user still hears the live filter
      setPreviewingFilterId(null);
      setIsPreviewing(false);
      if (
        state.currentTime < clip.startTime ||
        state.currentTime >= clip.startTime + clip.duration - 0.2
      ) {
        state.setCurrentTime(clip.startTime);
      }
      setIsPlaying(true);
    }
  };

  const handleSelectVoiceFilter = (filterId: VoiceFilter) => {
    globalAudioEngine.init();
    handleUpdate({ voiceFilter: filterId });
    if (filterId === 'none' || isPreviewing) {
      stopPreview();
    }
  };

  const handleTogglePreview = () => {
    if (isPreviewing) {
      stopPreview();
    } else {
      void runPreview(normalizedActiveId);
    }
  };

  const handleDownloadAudio = async () => {
    if (!('sourceUrl' in clip) || !clip.sourceUrl) return;
    setIsDownloading(true);
    try {
      let downloadUrl = clip.sourceUrl;
      let shouldRevoke = false;
      const safeName =
        (clip.name || 'audio-extraido').replace(/[^\w\s.-]/g, '').trim() ||
        'audio-extraido';

      // Ensure we download a clean WAV file even if sourceUrl is a video blob
      if (!clip.sourceUrl.startsWith('procedural://')) {
        try {
          const extracted = await globalAudioEngine.extractAudioFromUrl(
            clip.sourceUrl
          );
          downloadUrl = extracted.url;
          shouldRevoke = true;
        } catch {}
      }

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = safeName.endsWith('.wav') ? safeName : `${safeName}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (shouldRevoke) {
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
      }
      showToast('🔊 Audio descargado en WAV');
    } catch {
      showToast('⚠️ No se pudo descargar este audio');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDetectBeats = async () => {
    if (!('sourceUrl' in clip)) return;
    setIsDetectingBeats(true);
    try {
      const markers = await globalAudioEngine.detectBeats(clip.sourceUrl);
      if (clip.type === 'audio') {
        updateClip(clip.id, { beatMarkers: markers });
      }
    } finally {
      setIsDetectingBeats(false);
    }
  };

  return (
    <div className="space-y-4 p-4 text-xs text-slate-300">
      {/* 50 Voice Filters + Live Preview */}
      {!volumeOnly && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-slate-100 font-bold flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-indigo-400" />
              <span>Filtros de Voz (50)</span>
            </label>
            <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
              Clip: <strong className="text-slate-200">{clip.name}</strong>
            </span>
          </div>

          {/* Live Preview Bar */}
          <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm leading-none">
                  {activeFilterDef ? activeFilterDef.emoji : '🎙️'}
                </span>
                <span className="font-bold text-slate-100 truncate">
                  {activeFilterDef ? activeFilterDef.label : 'Voz Natural (Sin filtro)'}
                </span>
                {isPreviewing && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold animate-pulse">
                    Escuchando...
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {activeFilterDef
                  ? activeFilterDef.description
                  : 'Elige un filtro de la lista y pruébalo al instante'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleTogglePreview}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all active:scale-95 ${
                  isPreviewing
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                }`}
              >
                {isPreviewing ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Detener</span>
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

          {/* Search & Reset Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar filtro: niño, mujer, anciano, borracho, robot, ardilla..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 placeholder:text-slate-500 text-[11px] focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {normalizedActiveId !== 'none' && (
              <button
                type="button"
                onClick={() => handleSelectVoiceFilter('none')}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold text-[11px] flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Original</span>
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <HorizontalScrollRow className="gap-1.5">
            {VOICE_FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600/35 border-indigo-400 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </HorizontalScrollRow>

          {/* 50 Voice Filters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {/* Natural / Original Option */}
            {selectedCategory === 'all' && !searchQuery.trim() && (
              <button
                type="button"
                onClick={() => handleSelectVoiceFilter('none')}
                className={`px-2.5 py-2 rounded-lg text-left border transition-all flex items-center gap-2 active:scale-95 ${
                  normalizedActiveId === 'none'
                    ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-sm'
                    : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="text-base leading-none shrink-0">🎙️</span>
                <div className="min-w-0">
                  <div className="font-semibold text-[11px] truncate">Original</div>
                  <div className="text-[9px] text-slate-400 truncate">Sin filtro</div>
                </div>
              </button>
            )}

            {filteredVoiceFilters.map((vf) => {
              const isSelected = normalizedActiveId === vf.id;
              const isThisPreviewing = isPreviewing && previewingFilterId === vf.id;
              return (
                <button
                  key={vf.id}
                  type="button"
                  onClick={() => handleSelectVoiceFilter(vf.id)}
                  className={`px-2.5 py-2 rounded-lg text-left border transition-all flex items-center gap-2 active:scale-95 ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-sm'
                      : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span className="text-base leading-none shrink-0">{vf.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[11px] truncate flex items-center gap-1">
                      <span className="truncate">{vf.label}</span>
                      {isThisPreviewing && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      )}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {vf.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredVoiceFilters.length === 0 && (
            <div className="text-center py-4 text-slate-400 text-[11px]">
              No se encontraron filtros para "{searchQuery}".
            </div>
          )}
        </div>
      )}

      {/* Volume Slider (0% to 1000%) */}
      <div className={!volumeOnly ? 'pt-3 border-t border-white/10' : ''}>
        <div className="flex justify-between items-center text-slate-200 font-semibold mb-1">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-indigo-400" />
            Volumen y Ganancia
          </span>
          <span className="font-mono text-indigo-400 font-bold">
            {audio.volume}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1000"
          step="5"
          value={audio.volume}
          onChange={(e) => handleUpdate({ volume: Number(e.target.value) })}
          className="w-full accent-indigo-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
          <span>Silencio (0%)</span>
          <span>Normal (100%)</span>
          <span>Amplificado (1000%)</span>
        </div>
      </div>

      {/* Fade In & Fade Out Envelopes */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Aparición (Fade In)</span>
            <span className="font-mono">{audio.fadeInDuration}s</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={audio.fadeInDuration}
            onChange={(e) =>
              handleUpdate({ fadeInDuration: Number(e.target.value) })
            }
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Desvanecer (Fade Out)</span>
            <span className="font-mono">{audio.fadeOutDuration}s</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={audio.fadeOutDuration}
            onChange={(e) =>
              handleUpdate({ fadeOutDuration: Number(e.target.value) })
            }
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Beat Detection & Download Audio (for Audio Clips) */}
      {!volumeOnly && clip.type === 'audio' && (
        <div className="pt-2 border-t border-white/10 space-y-2">
          <button
            onClick={handleDetectBeats}
            disabled={isDetectingBeats}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-md font-semibold bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-300 transition-colors"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>
              {isDetectingBeats
                ? 'Analizando transitorios...'
                : 'Detectar Ritmo (Beats de Música)'}
            </span>
          </button>

          <button
            onClick={handleDownloadAudio}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-md font-semibold bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-200 transition-colors disabled:opacity-60"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>
              {isDownloading ? 'Preparando WAV...' : 'Descargar Audio Extraído (WAV)'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
