// ============================================================================
// EditorBottomBar.tsx - Bottom Navigation Dock & Clip Tools
// ============================================================================

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '../../store/useEditorStore';
import { TextClip, VideoClip } from '../../types/editor';
import {
  extractKeyframeProperties,
  interpolateClipTransform,
} from '../../core/keyframes/interpolateKeyframes';
import {
  Music,
  Type,
  Layers,
  Sparkles,
  Palette,
  Smartphone,
  SlidersHorizontal,
  PaintBucket,
  ChevronLeft,
  Gauge,
  Zap,
  Trash2,
  Volume2,
  Wand2,
  Move,
  RotateCcw,
  Snowflake,
  Copy,
  Diamond,
  Crop,
  PlusCircle,
  MinusCircle,
  FileAudio,
  Mic,
} from 'lucide-react';
import {
  SplitBracketIcon,
  TrimLeftBracketIcon,
  TrimRightBracketIcon,
  PipOverlayIcon,
} from '../Timeline/CutIcons';

interface ToolItem {
  id: string;
  label: string;
  icon: any;
  action: () => void;
  highlight?: boolean;
  accentOrange?: boolean;
  isBack?: boolean;
  danger?: boolean;
  hidden?: boolean;
  active?: boolean;
}

const VolumeLineVIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 5l7 11 7-11" />
    <line x1="3" y1="20" x2="21" y2="20" strokeWidth="1.8" />
    <circle cx="12" cy="20" r="1.8" fill="currentColor" />
  </svg>
);

interface EditorBottomBarProps {
  onOpenTool: (toolId: string) => void;
  activeTool: string | null;
  onToggleDubbing?: () => void;
}

export const EditorBottomBar: React.FC<EditorBottomBarProps> = ({
  onOpenTool,
  activeTool,
  onToggleDubbing,
}) => {
  const {
    selectedClipId,
    selectClip,
    splitClip,
    trimLeftClip,
    trimRightClip,
    deleteClip,
    duplicateClip,
    freezeFrame,
    reverseClip,
    separateAudio,
    addKeyframe,
    removeKeyframe,
    showToast,
    project,
    setIsMediaDrawerOpen,
    isRecordingDub,
    keyframeAtPlayheadId,
    isScreenCropMode,
    setScreenCropMode,
    toggleTrackVolumeLine,
    addTrackVolumeNodeAtPlayhead,
    removeSelectedTrackVolumeNode,
    selectedVolumeNode,
    isVolumeLineActive,
  } = useEditorStore(
    useShallow((s) => {
      let kfId: string | null = null;
      let activeTrackId: string | null = s.selectedTrackId;
      if (s.selectedClipId) {
        for (const tr of s.project.tracks) {
          const c = tr.clips.find((cl) => cl.id === s.selectedClipId);
          if (c) {
            if (tr.type !== 'text') activeTrackId = tr.id;
            if (
              c.type === 'video' ||
              c.type === 'image' ||
              c.type === 'text' ||
              c.type === 'subtitle'
            ) {
              const animClip = c as VideoClip | TextClip;
              if (animClip.keyframes?.length) {
                const lt = Number(
                  Math.max(
                    0,
                    Math.min(animClip.duration, s.currentTime - animClip.startTime)
                  ).toFixed(2)
                );
                const foundKf = animClip.keyframes.find(
                  (k) => Math.abs(k.time - lt) <= 0.05
                );
                kfId = foundKf ? foundKf.id : null;
              }
            }
            break;
          }
        }
      }
      const volActive = activeTrackId
        ? Boolean(s.visibleVolumeTracks[activeTrackId])
        : s.project.tracks.some(
            (tr) => tr.type !== 'text' && Boolean(s.visibleVolumeTracks[tr.id])
          );
      return {
        selectedClipId: s.selectedClipId,
        selectClip: s.selectClip,
        splitClip: s.splitClip,
        trimLeftClip: s.trimLeftClip,
        trimRightClip: s.trimRightClip,
        deleteClip: s.deleteClip,
        duplicateClip: s.duplicateClip,
        freezeFrame: s.freezeFrame,
        reverseClip: s.reverseClip,
        separateAudio: s.separateAudio,
        addKeyframe: s.addKeyframe,
        removeKeyframe: s.removeKeyframe,
        showToast: s.showToast,
        project: s.project,
        setIsMediaDrawerOpen: s.setIsMediaDrawerOpen,
        isRecordingDub: s.isRecordingDub,
        keyframeAtPlayheadId: kfId,
        isScreenCropMode: s.isScreenCropMode,
        setScreenCropMode: s.setScreenCropMode,
        toggleTrackVolumeLine: s.toggleTrackVolumeLine,
        addTrackVolumeNodeAtPlayhead: s.addTrackVolumeNodeAtPlayhead,
        removeSelectedTrackVolumeNode: s.removeSelectedTrackVolumeNode,
        selectedVolumeNode: s.selectedVolumeNode,
        isVolumeLineActive: volActive,
      };
    })
  );

  const allClips = project.tracks.flatMap((t) => t.clips);

  const selectedClip = selectedClipId
    ? allClips.find((c) => c.id === selectedClipId)
    : null;

  const isVideo = selectedClip?.type === 'video';
  const isVisual =
    selectedClip?.type === 'video' || selectedClip?.type === 'image';
  const isAnimatable =
    isVisual ||
    selectedClip?.type === 'text' ||
    selectedClip?.type === 'subtitle';

  const animatableClip = isAnimatable
    ? (selectedClip as VideoClip | TextClip)
    : null;

  const handleToggleKeyframe = () => {
    if (!animatableClip) return;
    if (keyframeAtPlayheadId) {
      removeKeyframe(animatableClip.id, keyframeAtPlayheadId);
      showToast('💎 Keyframe eliminado');
      return;
    }
    const now = useEditorStore.getState().currentTime;
    const localTime = Number(
      Math.max(
        0,
        Math.min(animatableClip.duration, now - animatableClip.startTime)
      ).toFixed(2)
    );
    const effectiveTransform = interpolateClipTransform(animatableClip, localTime);
    addKeyframe(animatableClip.id, {
      id: 'kf_' + Math.random().toString(36).substring(2, 9),
      time: localTime,
      properties: extractKeyframeProperties(effectiveTransform),
      easing: 'easeInOut',
    });
  };

  // Helper: select clip under playhead or first visual clip so tools always work immediately
  const ensureVisualClipSelected = () => {
    if (selectedClipId) return selectedClipId;
    const now = useEditorStore.getState().currentTime;
    const atPlayhead = allClips.find(
      (c) =>
        (c.type === 'video' || c.type === 'image') &&
        now >= c.startTime &&
        now <= c.startTime + c.duration
    );
    const fallback =
      atPlayhead ||
      allClips.find((c) => c.type === 'video' || c.type === 'image') ||
      allClips[0];
    if (fallback) {
      selectClip(fallback.id);
      return fallback.id;
    }
    return null;
  };

  // --------------------------------------------------------------------------
  // ROOT TOOLS (When NO clip is selected - ALL available tools shown!)
  // --------------------------------------------------------------------------
  const rootTools: ToolItem[] = [
    {
      id: 'media',
      label: 'Agregar',
      icon: PlusCircle,
      action: () => setIsMediaDrawerOpen(true),
      highlight: true,
    },
    {
      id: 'text',
      label: 'Texto',
      icon: Type,
      action: () => onOpenTool('text'),
      highlight: true,
    },
    {
      id: 'pip',
      label: 'PIP',
      icon: PipOverlayIcon,
      action: () => setIsMediaDrawerOpen(true, 'pip'),
      accentOrange: true,
    },
    {
      id: 'dubbing',
      label: isRecordingDub ? 'Detener' : 'Doblaje',
      icon: Mic,
      action: () => onToggleDubbing?.(),
      active: isRecordingDub,
      danger: isRecordingDub,
    },
    {
      id: 'volumeLineV',
      label: 'V',
      icon: VolumeLineVIcon,
      action: () => toggleTrackVolumeLine(),
      active: isVolumeLineActive,
    },
    {
      id: 'splitRoot',
      label: 'Dividir',
      icon: SplitBracketIcon,
      action: () => {
        const id = ensureVisualClipSelected();
        if (id) splitClip(id);
        else setIsMediaDrawerOpen(true);
      },
    },
    {
      id: 'trimLeftRoot',
      label: 'Recortar Izq.',
      icon: TrimLeftBracketIcon,
      action: () => {
        const id = ensureVisualClipSelected();
        if (id) trimLeftClip(id);
        else setIsMediaDrawerOpen(true);
      },
    },
    {
      id: 'trimRightRoot',
      label: 'Recortar Der.',
      icon: TrimRightBracketIcon,
      action: () => {
        const id = ensureVisualClipSelected();
        if (id) trimRightClip(id);
        else setIsMediaDrawerOpen(true);
      },
    },
    {
      id: 'transitions',
      label: 'Transiciones',
      icon: Layers,
      action: () => {
        ensureVisualClipSelected();
        onOpenTool('transitions');
      },
    },
    {
      id: 'animation',
      label: 'Animación',
      icon: Zap,
      action: () => {
        ensureVisualClipSelected();
        onOpenTool('animation');
      },
    },
    {
      id: 'transformRoot',
      label: 'Tamaño/Pos',
      icon: Move,
      action: () => {
        ensureVisualClipSelected();
        onOpenTool('transform');
      },
    },
    {
      id: 'speedRoot',
      label: 'Velocidad',
      icon: Gauge,
      action: () => {
        ensureVisualClipSelected();
        onOpenTool('speed');
      },
    },
    {
      id: 'audio',
      label: 'Audio',
      icon: Music,
      action: () => onOpenTool('audio'),
    },
    {
      id: 'separateAudioRoot',
      label: 'Separar Audio',
      icon: FileAudio,
      action: () => {
        separateAudio();
      },
    },
    {
      id: 'effects',
      label: 'Efectos FX',
      icon: Sparkles,
      action: () => {
        ensureVisualClipSelected();
        onOpenTool('effects');
      },
    },
    {
      id: 'filters',
      label: 'Filtros',
      icon: Palette,
      action: () => {
        ensureVisualClipSelected();
        onOpenTool('filters');
      },
    },
    {
      id: 'adjust',
      label: 'Ajustar',
      icon: SlidersHorizontal,
      action: () => {
        ensureVisualClipSelected();
        onOpenTool('adjust');
      },
    },
    {
      id: 'chromaRoot',
      label: 'Croma Key',
      icon: Wand2,
      action: () => {
        ensureVisualClipSelected();
        onOpenTool('chroma');
      },
    },
    {
      id: 'maskRoot',
      label: 'Máscara',
      icon: Crop,
      action: () => {
        ensureVisualClipSelected();
        onOpenTool('mask');
      },
    },
    {
      id: 'keyframesRoot',
      label: 'Keyframes',
      icon: Diamond,
      action: () => {
        ensureVisualClipSelected();
        onOpenTool('keyframes');
      },
    },
    {
      id: 'format',
      label: 'Pantalla',
      icon: Smartphone,
      action: () => onOpenTool('format'),
    },
    {
      id: 'screenCrop',
      label: 'Recortar Pant.',
      icon: Crop,
      action: () => {
        setScreenCropMode(!isScreenCropMode);
      },
      active: isScreenCropMode,
    },
    {
      id: 'canvas',
      label: 'Fondo',
      icon: PaintBucket,
      action: () => onOpenTool('canvas'),
    },
    {
      id: 'freezeRoot',
      label: 'Congelar',
      icon: Snowflake,
      action: () => {
        const id = ensureVisualClipSelected();
        if (id) freezeFrame(id);
      },
    },
    {
      id: 'reverseRoot',
      label: 'Invertir',
      icon: RotateCcw,
      action: () => {
        const id = ensureVisualClipSelected();
        if (id) reverseClip(id);
      },
    },
    {
      id: 'duplicateRoot',
      label: 'Duplicar',
      icon: Copy,
      action: () => {
        const id = ensureVisualClipSelected();
        if (id) duplicateClip(id);
      },
    },
    {
      id: 'deleteRoot',
      label: 'Eliminar',
      icon: Trash2,
      action: () => {
        const id = ensureVisualClipSelected();
        if (id) deleteClip(id);
      },
      danger: true,
    },
  ];

  // --------------------------------------------------------------------------
  // CLIP TOOLS (When a clip IS selected - Contextual Submenu)
  // --------------------------------------------------------------------------
  const clipTools: ToolItem[] = [
    {
      id: 'back',
      label: 'Volver',
      icon: ChevronLeft,
      action: () => selectClip(null),
      isBack: true,
    },
    {
      id: 'dubbing',
      label: isRecordingDub ? 'Detener' : 'Doblaje',
      icon: Mic,
      action: () => onToggleDubbing?.(),
      active: isRecordingDub,
      danger: isRecordingDub,
    },
    {
      id: 'split',
      label: 'Dividir',
      icon: SplitBracketIcon,
      action: () => splitClip(selectedClipId || undefined),
    },
    {
      id: 'trimLeft',
      label: 'Recortar Izq.',
      icon: TrimLeftBracketIcon,
      action: () => trimLeftClip(selectedClipId || undefined),
    },
    {
      id: 'trimRight',
      label: 'Recortar Der.',
      icon: TrimRightBracketIcon,
      action: () => trimRightClip(selectedClipId || undefined),
    },
    {
      id: 'transitions',
      label: 'Transición',
      icon: Layers,
      action: () => onOpenTool('transitions'),
      hidden: !isVisual,
      active:
        isVisual &&
        (selectedClip as any)?.transition?.type &&
        (selectedClip as any)?.transition?.type !== 'none',
    },
    {
      id: 'animation',
      label: 'Animación',
      icon: Zap,
      action: () => onOpenTool('animation'),
      hidden: selectedClip?.type === 'audio',
      active:
        selectedClip?.type !== 'audio' &&
        Boolean(
          (selectedClip as any)?.animations?.inType !== 'none' ||
            (selectedClip as any)?.animations?.outType !== 'none' ||
            (selectedClip as any)?.animations?.comboType !== 'none'
        ),
    },
    {
      id: 'separateAudio',
      label: 'Separar Audio',
      icon: FileAudio,
      action: () => selectedClipId && separateAudio(selectedClipId),
      hidden: !isVideo,
      highlight: isVideo && !(selectedClip as any)?.hasSeparatedAudio,
    },
    {
      id: 'transform',
      label: 'Tamaño/Pos',
      icon: Move,
      action: () => onOpenTool('transform'),
      hidden: selectedClip?.type === 'audio',
    },
    {
      id: 'speed',
      label: 'Velocidad',
      icon: Gauge,
      action: () => onOpenTool('speed'),
      hidden: !isVideo,
    },
    {
      id: 'volumeLineV',
      label: 'V',
      icon: VolumeLineVIcon,
      action: () => toggleTrackVolumeLine(),
      hidden: selectedClip?.type === 'text' || selectedClip?.type === 'subtitle',
      active: isVolumeLineActive,
    },
    {
      id: 'volume',
      label: 'Volumen',
      icon: Volume2,
      action: () => onOpenTool('volume'),
      hidden: selectedClip?.type === 'image' || selectedClip?.type === 'text',
    },
    {
      id: 'textEdit',
      label: 'Editar Texto',
      icon: Type,
      action: () => onOpenTool('text'),
      hidden:
        selectedClip?.type !== 'text' && selectedClip?.type !== 'subtitle',
      highlight: true,
    },
    {
      id: 'effects',
      label: 'Efectos FX',
      icon: Sparkles,
      action: () => onOpenTool('effects'),
      hidden: !isVisual,
    },
    {
      id: 'filters',
      label: 'Filtros/Color',
      icon: Palette,
      action: () => onOpenTool('color'),
      hidden: !isVisual,
    },
    {
      id: 'chroma',
      label: 'Croma Key',
      icon: Wand2,
      action: () => onOpenTool('chroma'),
      hidden: !isVisual,
    },
    {
      id: 'mask',
      label: 'Máscara',
      icon: Crop,
      action: () => onOpenTool('mask'),
      hidden: !isVisual,
    },
    {
      id: 'keyframes',
      label: 'Keyframes',
      icon: Diamond,
      action: handleToggleKeyframe,
      hidden: !isAnimatable,
      active: Boolean(keyframeAtPlayheadId),
    },
    {
      id: 'freeze',
      label: 'Congelar',
      icon: Snowflake,
      action: () => selectedClipId && freezeFrame(selectedClipId),
      hidden: !isVideo,
    },
    {
      id: 'reverse',
      label: 'Invertir',
      icon: RotateCcw,
      action: () => selectedClipId && reverseClip(selectedClipId),
      hidden: !isVideo,
      active: selectedClip?.isReversed,
    },
    {
      id: 'duplicate',
      label: 'Duplicar',
      icon: Copy,
      action: () => selectedClipId && duplicateClip(selectedClipId),
    },
    {
      id: 'delete',
      label: 'Eliminar',
      icon: Trash2,
      action: () => selectedClipId && deleteClip(selectedClipId),
      danger: true,
    },
  ];

  const toolsToDisplay = selectedClipId
    ? clipTools.filter((t) => !t.hidden)
    : rootTools;

  const isElectronDesktop = Boolean(
    typeof window !== 'undefined' &&
      (window as unknown as { electronAPI?: { isElectron?: boolean } })
        .electronAPI?.isElectron
  );

  return (
    <div className="w-full shrink-0 select-none z-30 flex flex-col">
      {/* Sub-options bar for "V" (Volume Line): Add Node & Remove Node */}
      {isVolumeLineActive && (
        <div className="w-full bg-[#0d1220] border-t border-sky-500/35 px-2 py-1.5 flex items-center justify-center gap-2 shadow-[0_-4px_16px_rgba(14,165,233,0.18)]">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 pr-1">
            <VolumeLineVIcon className="w-3.5 h-3.5" />
            <span>Línea V:</span>
          </span>
          <button
            type="button"
            onClick={() => addTrackVolumeNodeAtPlayhead()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-100 text-xs font-bold active:scale-95 transition-all"
            title="Añadir nodo en la posición actual de la guía fija o línea roja"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-300" />
            <span>Añadir nodo</span>
          </button>
          <button
            type="button"
            onClick={() => removeSelectedTrackVolumeNode()}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold active:scale-95 transition-all ${
              selectedVolumeNode
                ? 'bg-rose-500/25 hover:bg-rose-500/35 border-rose-400/60 text-rose-100'
                : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-300'
            }`}
            title="Quitar el nodo seleccionado (o el nodo bajo el cabezal)"
          >
            <MinusCircle className="w-3.5 h-3.5 text-rose-300" />
            <span>Quitar nodo</span>
          </button>
        </div>
      )}

      <div
        className={
          isElectronDesktop
            ? 'w-full bg-[#0a0b12] border-t border-white/10 px-2 py-1.5 flex items-center justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.5)]'
            : 'w-full bg-[#0a0b12] border-t border-white/10 px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] flex items-center overflow-x-auto no-scrollbar shadow-[0_-4px_20px_rgba(0,0,0,0.5)]'
        }
      >
        <div
          className={
            isElectronDesktop
              ? 'w-full flex flex-wrap items-center justify-center gap-x-1 gap-y-1'
              : 'flex items-center gap-1 sm:gap-1.5 mx-auto min-w-max px-2'
          }
        >
        {toolsToDisplay.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id || tool.active;
          const isBack = tool.isBack;
          const isDanger = tool.danger;
          const isHighlight = tool.highlight;
          const isAccentOrange = tool.accentOrange;

          return (
            <button
              key={tool.id}
              onClick={tool.action}
              className={`flex flex-col items-center justify-center ${
                isElectronDesktop
                  ? 'min-w-[56px] py-1 px-1.5'
                  : 'min-w-[54px] sm:min-w-[62px] py-1 px-1.5'
              } rounded-lg transition-all active:scale-95 ${
                isBack
                  ? 'bg-white/10 text-white font-bold hover:bg-white/20'
                  : isActive
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-semibold'
                  : isDanger
                  ? 'text-rose-400 hover:bg-rose-500/10'
                  : isAccentOrange
                  ? 'text-orange-400 bg-orange-500/10 hover:bg-orange-500/20'
                  : isHighlight
                  ? 'text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
              title={
                tool.id === 'pip'
                  ? 'Agregar video o imagen superpuesta (PIP)'
                  : tool.id === 'dubbing'
                  ? 'Grabar voz / doblaje simultáneamente mientras corre el video'
                  : tool.id === 'volumeLineV'
                  ? 'Herramienta V: Mostrar/ocultar línea de volumen sobre la pista (doble toque para añadir o eliminar nodos)'
                  : undefined
              }
            >
              <div
                className={`${isElectronDesktop ? 'p-0.5' : 'p-1'} rounded-full mb-0.5 ${
                  isAccentOrange
                    ? 'bg-orange-500/20 text-orange-400'
                    : isHighlight
                    ? 'bg-indigo-500/25 text-indigo-300'
                    : isBack
                    ? 'bg-white/20 text-white'
                    : ''
                }`}
              >
                <Icon className={isElectronDesktop ? 'w-4 h-4' : 'w-4 h-4 sm:w-4.5 sm:h-4.5'} />
              </div>
              <span
                className={`${
                  isElectronDesktop
                    ? 'text-[10px] leading-tight'
                    : 'text-[10px] sm:text-[11px]'
                } font-medium tracking-tight whitespace-nowrap`}
              >
                {tool.label}
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
};
