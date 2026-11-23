// ============================================================================
// ToolDrawer.tsx - Bottom Sheet for All Tools & Animations
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '../../store/useEditorStore';
import {
  extractAudioFromVideoFiles,
  importMediaFiles,
} from '../../core/media/importMediaFiles';
import { isAndroidNativeApp } from '../../core/native/androidBridge';
import {
  Check,
  X,
  Smartphone,
  Monitor,
  Square,
  Plus,
  Volume2,
  Upload,
  Maximize,
  Minimize,
  Play,
  Hand,
  Move,
  Music,
  Crop,
} from 'lucide-react';
import { SpeedTab } from '../Inspector/tabs/SpeedTab';
import { ColorGradingTab } from '../Inspector/tabs/ColorGradingTab';
import { AudioTab } from '../Inspector/tabs/AudioTab';
import { ChromaKeyTab } from '../Inspector/tabs/ChromaKeyTab';
import { MaskTab } from '../Inspector/tabs/MaskTab';
import { TransformTab } from '../Inspector/tabs/TransformTab';
import { TextTab } from '../Inspector/tabs/TextTab';
import { KeyframeTab } from '../Inspector/tabs/KeyframeTab';
import { TransitionsTab } from '../Inspector/tabs/TransitionsTab';
import { AnimationsTab } from '../Inspector/tabs/AnimationsTab';
import { ColorPalettePicker } from '../Common/ColorPalettePicker';
import { HorizontalScrollRow } from './HorizontalScrollRow';
import { globalAudioEngine } from '../../core/audio/AudioEngine';
import {
  VideoClip,
  AudioClip,
  TextClip,
  AspectRatio,
} from '../../types/editor';

interface ToolDrawerProps {
  toolId: string | null;
  inline?: boolean;
  onClose: () => void;
}

export const ToolDrawer: React.FC<ToolDrawerProps> = ({
  toolId,
  inline = false,
  onClose,
}) => {
  const {
    project,
    selectedClipId,
    selectClip,
    setIsPlaying,
    setAspectRatio,
    setCustomCanvasDimensions,
    setScreenCropMode,
    setCanvasBackground,
    canvasHeightVh,
    setCanvasHeightVh,
    updateClip,
    addClip,
    setIsMediaDrawerOpen,
    setInlineEditingTextClipId,
    showToast,
    restoreHistorySnapshot,
    restoreProjectSnapshot,
    commitToolSession,
    eyedropperRequest,
  } = useEditorStore(
    useShallow((s) => ({
      project: s.project,
      selectedClipId: s.selectedClipId,
      selectClip: s.selectClip,
      setIsPlaying: s.setIsPlaying,
      setAspectRatio: s.setAspectRatio,
      setCustomCanvasDimensions: s.setCustomCanvasDimensions,
      setScreenCropMode: s.setScreenCropMode,
      setCanvasBackground: s.setCanvasBackground,
      canvasHeightVh: s.canvasHeightVh,
      setCanvasHeightVh: s.setCanvasHeightVh,
      updateClip: s.updateClip,
      addClip: s.addClip,
      setIsMediaDrawerOpen: s.setIsMediaDrawerOpen,
      setInlineEditingTextClipId: s.setInlineEditingTextClipId,
      showToast: s.showToast,
      restoreHistorySnapshot: s.restoreHistorySnapshot,
      restoreProjectSnapshot: s.restoreProjectSnapshot,
      commitToolSession: s.commitToolSession,
      eyedropperRequest: s.eyedropperRequest,
    }))
  );

  const addAudioInputRef = useRef<HTMLInputElement | null>(null);
  const extractVideoInputRef = useRef<HTMLInputElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const [isDrawerInputFocused, setIsDrawerInputFocused] = useState(false);
  const [keyboardHeightPx, setKeyboardHeightPx] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number((window as unknown as { __dulosKeyboardHeight?: number }).__dulosKeyboardHeight) || 0;
  });

  useEffect(() => {
    const handleNativeKeyboard = (e: Event) => {
      const custom = e as CustomEvent<{ height?: number }>;
      const h = Math.max(0, Math.round(Number(custom.detail?.height) || 0));
      setKeyboardHeightPx(h);
    };

    const handleVisualViewport = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const diff = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      // Only treat significant viewport shrink (> 100px) as a virtual keyboard
      setKeyboardHeightPx(diff > 100 ? diff : 0);
    };

    window.addEventListener('dulos-keyboard-height', handleNativeKeyboard);
    window.visualViewport?.addEventListener('resize', handleVisualViewport);
    window.visualViewport?.addEventListener('scroll', handleVisualViewport);

    return () => {
      window.removeEventListener('dulos-keyboard-height', handleNativeKeyboard);
      window.visualViewport?.removeEventListener('resize', handleVisualViewport);
      window.visualViewport?.removeEventListener('scroll', handleVisualViewport);
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const isTextEntryElement = (el: Element | null): boolean => {
    if (!el) return false;
    if (el instanceof HTMLTextAreaElement) return true;
    if (el instanceof HTMLInputElement) {
      const nonTextTypes = [
        'range',
        'checkbox',
        'radio',
        'color',
        'file',
        'button',
        'submit',
        'reset',
        'hidden',
      ];
      return !nonTextTypes.includes((el.type || 'text').toLowerCase());
    }
    return false;
  };

  const handleDrawerFocusCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    if (isTextEntryElement(e.target)) {
      setIsDrawerInputFocused(true);
    }
  };

  const handleDrawerBlurCapture = () => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = window.setTimeout(() => {
      blurTimeoutRef.current = null;
      const active = document.activeElement;
      const stillInside = Boolean(
        drawerRef.current && active && drawerRef.current.contains(active) && isTextEntryElement(active)
      );
      setIsDrawerInputFocused(stillInside);
    }, 120);
  };

  // Snapshot taken the moment a tool is opened so that changes are ONLY applied if user clicks "Listo"
  const initialSnapshotRef = useRef<{
    toolId: string;
    project: any;
    historySnapshot: { undoStack: string[]; redoStack: string[] };
    selectedClipId: string | null;
    selectedTrackId: string | null;
    canvasHeightVh: number;
    currentTime: number;
  } | null>(null);

  if (
    toolId &&
    (!initialSnapshotRef.current || initialSnapshotRef.current.toolId !== toolId)
  ) {
    const st = useEditorStore.getState();
    initialSnapshotRef.current = {
      toolId,
      project: JSON.parse(JSON.stringify(st.project)),
      historySnapshot: st.getHistorySnapshot(),
      selectedClipId: st.selectedClipId,
      selectedTrackId: st.selectedTrackId,
      canvasHeightVh: st.canvasHeightVh,
      currentTime: st.currentTime,
    };
  }

  const handleApply = () => {
    globalAudioEngine.stopVoiceFilterPreview();
    setInlineEditingTextClipId(null);
    if (initialSnapshotRef.current) {
      commitToolSession(
        initialSnapshotRef.current.project,
        initialSnapshotRef.current.historySnapshot
      );
      showToast('✅ Herramienta aplicada');
    }
    onClose();
  };

  const handleSplitRevoked = () => {
    globalAudioEngine.stopVoiceFilterPreview();
    setInlineEditingTextClipId(null);
    if (initialSnapshotRef.current) {
      commitToolSession(
        initialSnapshotRef.current.project,
        initialSnapshotRef.current.historySnapshot
      );
    }
    onClose();
  };

  const handleCancel = () => {
    globalAudioEngine.stopVoiceFilterPreview();
    setInlineEditingTextClipId(null);
    if (initialSnapshotRef.current) {
      restoreHistorySnapshot(initialSnapshotRef.current.historySnapshot);
      restoreProjectSnapshot(initialSnapshotRef.current.project, {
        selectedClipId: initialSnapshotRef.current.selectedClipId,
        selectedTrackId: initialSnapshotRef.current.selectedTrackId,
        canvasHeightVh: initialSnapshotRef.current.canvasHeightVh,
        currentTime: initialSnapshotRef.current.currentTime,
      });
      showToast('❌ Cancelado: sin cambios');
    }
    onClose();
  };

  useEffect(() => {
    return () => {
      globalAudioEngine.stopVoiceFilterPreview();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (useEditorStore.getState().inlineEditingTextClipId) {
          return;
        }
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!toolId) return null;

  const allClips = project.tracks.flatMap((t) => t.clips);

  const selectedClip = selectedClipId
    ? allClips.find((c) => c.id === selectedClipId)
    : null;

  // Smart fallback clip so tools work even if user didn't click a clip first
  const activeVisualClip = (
    selectedClip &&
    (selectedClip.type === 'video' || selectedClip.type === 'image')
      ? selectedClip
      : allClips.find(
          (c) => c.type === 'video' || c.type === 'image'
        )
  ) as VideoClip | undefined;

  const activeAnimatableClip = (
    selectedClip && selectedClip.type !== 'audio'
      ? selectedClip
      : activeVisualClip ||
        allClips.find((c) => c.type === 'text' || c.type === 'subtitle')
  ) as (VideoClip | TextClip) | undefined;

  const isClipAtPlayhead = (c: { startTime: number; duration: number }) => {
    const now = useEditorStore.getState().currentTime;
    return now >= c.startTime - 0.02 && now <= c.startTime + c.duration + 0.02;
  };

  const activeAudioOrVideoClip = (
    selectedClip &&
    (selectedClip.type === 'audio' || selectedClip.type === 'video')
      ? selectedClip
      : allClips.find((c) => c.type === 'audio' && isClipAtPlayhead(c)) ||
        allClips.find((c) => c.type === 'video' && isClipAtPlayhead(c)) ||
        allClips.find((c) => c.type === 'audio' || c.type === 'video')
  ) as (VideoClip | AudioClip) | undefined;

  const activeTextClip = (
    selectedClip &&
    (selectedClip.type === 'text' || selectedClip.type === 'subtitle')
      ? selectedClip
      : allClips.find((c) => c.type === 'text' || c.type === 'subtitle')
  ) as TextClip | undefined;

  // Helper to create a new Text clip on the fly
  const handleQuickAddText = () => {
    const newId = 'txt_' + Math.random().toString(36).substring(2, 9);
    const textClip: TextClip = {
      id: newId,
      trackId: 'track_text',
      type: 'text',
      name: 'Texto: Nuevo Título',
      startTime: useEditorStore.getState().currentTime,
      duration: 4.0,
      sourceStartTime: 0,
      sourceDuration: 4.0,
      speed: 1,
      transform: {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        blendMode: 'normal',
        freeResize: false,
      },
      animations: {
        inType: 'none',
        inDuration: 0.4,
        outType: 'none',
        outDuration: 0.4,
        comboType: 'none',
      },
      keyframes: [],
      textConfig: {
        text: 'NUEVO TEXTO',
        fontFamily: 'Inter',
        fontSize: 140,
        fontWeight: 900,
        color: '#ffffff',
        alignment: 'center',
        letterSpacing: 2,
        lineHeight: 1.15,
        curved: false,
        curveRadius: 0,
        strokeWidth: 5,
        strokeColor: '#000000',
        hasShadow: true,
        shadowColor: '#000000',
        shadowOpacity: 0.85,
        shadowBlur: 10,
        shadowDistance: 4,
        shadowAngle: 45,
        hasBackground: false,
        backgroundColor: '#4f46e5',
        backgroundOpacity: 0,
        backgroundPadding: 16,
        borderRadius: 12,
        animIn: 'none',
        animInDuration: 0.6,
        animOut: 'none',
        animOutDuration: 0.5,
        animLoop: 'none',
        animLoopSpeed: 1,
      },
    };
    addClip('track_text', textClip);
    selectClip(newId);
    setInlineEditingTextClipId(newId);
    showToast('🔤 Escribe directamente en la pantalla');
  };

  const getToolTitle = () => {
    switch (toolId) {
      case 'speed':
        return 'Velocidad Lineal';
      case 'color':
      case 'adjust':
      case 'filters':
        return 'Filtros y Ajustes de Color';
      case 'audio':
        return 'Audio';
      case 'volume':
        return 'Volumen';
      case 'chroma':
        return 'Chroma Key (Pantalla Verde)';
      case 'mask':
        return 'Máscaras de Recorte';
      case 'transform':
        return 'Tamaño de Pantalla, Posición, Rotación y Ajuste';
      case 'text':
      case 'textEdit':
        return 'Editor de Texto';
      case 'keyframes':
        return 'Fotogramas Clave (Keyframes)';
      case 'transitions':
        return 'Transiciones';
      case 'effects':
        return 'Efectos Visuales (FX)';
      case 'format':
        return 'Edición de Tamaño de Pantalla y Formato';
      case 'canvas':
        return 'Color y Fondo del Lienzo';
      case 'animation':
        return 'Animaciones (Entrada, Salida y Combo)';
      default:
        return 'Herramientas de Edición';
    }
  };

  const renderNoClipFallback = () => (
    <div className="p-5 text-center space-y-3">
      <p className="text-xs text-slate-300 font-medium">
        Aún no hay ningún video o imagen en la línea de tiempo.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => {
            onClose();
            setIsMediaDrawerOpen(true);
          }}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg"
        >
          <Upload className="w-4 h-4" />
          <span>Subir Video / Foto o Cargar Demo</span>
        </button>
      </div>
    </div>
  );

  const renderToolContent = () => {
    // 1. Format / Screen Size / Viewport Height
    if (toolId === 'format') {
      const aspectRatios: {
        id: AspectRatio;
        label: string;
        desc: string;
        icon: any;
      }[] = [
        { id: 'auto', label: 'Original', desc: 'Medida video/imagen', icon: Maximize },
        { id: '9:16', label: '9:16', desc: 'TikTok, Reels, Shorts', icon: Smartphone },
        { id: '16:9', label: '16:9', desc: 'YouTube, Horizontal HD', icon: Monitor },
        { id: '1:1', label: '1:1', desc: 'Cuadrado (Post)', icon: Square },
        { id: '4:5', label: '4:5', desc: 'Retrato Instagram', icon: Smartphone },
        { id: '21:9', label: '21:9', desc: 'Cine Ultra-Wide', icon: Monitor },
        { id: '4:3', label: '4:3', desc: 'TV / Clásico', icon: Monitor },
        { id: 'free', label: 'Libre (Dedos)', desc: 'Tamaño libre táctil', icon: Hand },
      ];

      const customW = project.settings.customWidth || 1080;
      const customH = project.settings.customHeight || 1920;

      return (
        <div className="p-4 space-y-4 text-xs">
          <div>
            <span className="text-slate-200 font-semibold block mb-2">
              1. Relación de Aspecto (Proporción de la Pantalla o Libre con Dedos):
            </span>
            <HorizontalScrollRow>
              {aspectRatios.map((item) => {
                const isSelected = project.settings.aspectRatio === item.id;
                const Icon = item.icon;
                const isFreeItem = item.id === 'free';
                return (
                  <button
                    key={item.id}
                    onClick={() => setAspectRatio(item.id)}
                    className={`shrink-0 w-[108px] sm:w-[116px] snap-start p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                      isSelected
                        ? isFreeItem
                          ? 'bg-cyan-500/30 border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400'
                          : 'bg-indigo-600/30 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400'
                        : isFreeItem
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected
                          ? isFreeItem
                            ? 'text-cyan-300'
                            : 'text-indigo-300'
                          : isFreeItem
                          ? 'text-cyan-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className="font-bold text-xs">{item.label}</span>
                    <span className="text-[9px] text-slate-400 leading-tight">
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </HorizontalScrollRow>
          </div>

          {/* Interactive Freehand Screen Crop Button */}
          <button
            onClick={() => {
              onClose();
              setScreenCropMode(true);
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/25 via-cyan-500/25 to-indigo-500/25 hover:from-emerald-500/35 hover:to-indigo-500/35 border border-emerald-400/50 text-emerald-200 font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow"
          >
            <Crop className="w-4 h-4 text-emerald-300" />
            <span>Recortar Pantalla a tu Gusto (Arrastrar Bordes)</span>
          </button>

          {project.settings.aspectRatio === 'free' && (
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <Hand className="w-4 h-4 shrink-0" />
                <span>
                  ¡Modo Libre Activo! Toca la imagen en la pantalla con 1 o 2 dedos (o arrastra sus bordes/esquinas azules) para darle cualquier tamaño.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Ancho del Lienzo</span>
                    <span className="font-mono text-cyan-400">{customW}px</span>
                  </div>
                  <input
                    type="range"
                    min="120"
                    max="2560"
                    step="20"
                    value={customW}
                    onChange={(e) =>
                      setCustomCanvasDimensions(Number(e.target.value), customH)
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Alto del Lienzo</span>
                    <span className="font-mono text-cyan-400">{customH}px</span>
                  </div>
                  <input
                    type="range"
                    min="120"
                    max="2560"
                    step="20"
                    value={customH}
                    onChange={(e) =>
                      setCustomCanvasDimensions(customW, Number(e.target.value))
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Screen Height Adjustment */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-200 font-semibold">
                2. Tamaño del Visor de Pantalla:
              </span>
              <span className="font-mono text-indigo-400 font-bold">
                {canvasHeightVh}% de altura
              </span>
            </div>
            <input
              type="range"
              min="28"
              max="68"
              value={canvasHeightVh}
              onChange={(e) => setCanvasHeightVh(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { label: 'Compacta (34%)', val: 34 },
                { label: 'Estándar (46%)', val: 46 },
                { label: 'Pantalla Grande (60%)', val: 60 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  onClick={() => setCanvasHeightVh(preset.val)}
                  className={`py-1.5 px-2 rounded border font-semibold transition-all ${
                    Math.abs(canvasHeightVh - preset.val) <= 3
                      ? 'bg-indigo-600 border-indigo-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Fit / Cover / Stretch for active clip */}
          {activeVisualClip && (
            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <span className="text-slate-200 font-semibold block">
                3. Encaje y Tamaño Libre de la Imagen / Video:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    updateClip(activeVisualClip.id, {
                      transform: {
                        ...activeVisualClip.transform,
                        fitMode: 'contain',
                        scale: 1,
                        scaleX: 1,
                        scaleY: 1,
                        x: 0,
                        y: 0,
                      },
                    });
                    showToast('📐 Imagen ajustada dentro de la pantalla');
                  }}
                  className="py-2 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1 text-slate-200 font-semibold"
                >
                  <Minimize className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ajustar (Fit)</span>
                </button>
                <button
                  onClick={() => {
                    updateClip(activeVisualClip.id, {
                      transform: {
                        ...activeVisualClip.transform,
                        fitMode: 'cover',
                        scale: 1,
                        scaleX: 1,
                        scaleY: 1,
                        x: 0,
                        y: 0,
                      },
                    });
                    showToast('📐 Imagen expandida para rellenar pantalla');
                  }}
                  className="py-2 px-2 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/40 flex items-center justify-center gap-1 text-indigo-200 font-semibold"
                >
                  <Maximize className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Rellenar</span>
                </button>
                <button
                  onClick={() => {
                    updateClip(activeVisualClip.id, {
                      transform: {
                        ...activeVisualClip.transform,
                        fitMode: 'fill',
                        scale: 1,
                        scaleX: 1,
                        scaleY: 1,
                        x: 0,
                        y: 0,
                      },
                    });
                    showToast('📐 Imagen estirada a los 4 bordes');
                  }}
                  className="py-2 px-2 rounded-lg bg-cyan-600/25 hover:bg-cyan-600/40 border border-cyan-500/40 flex items-center justify-center gap-1 text-cyan-200 font-semibold"
                >
                  <Move className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Estirar Libre</span>
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 2. Canvas Background
    if (toolId === 'canvas') {
      const colors = [
        '#000000',
        '#090a0f',
        '#1e1b4b',
        '#172554',
        '#064e3b',
        '#701a75',
        '#881337',
        '#ffffff',
        '#475569',
        '#f97316',
        '#10b981',
        '#ec4899',
      ];
      return (
        <div className="p-4 space-y-3">
          <span className="text-xs text-slate-300 font-semibold block">
            Color de fondo de la pantalla:
          </span>
          <ColorPalettePicker
            value={project.settings.background.color || '#000000'}
            onChange={(hex) =>
              setCanvasBackground({
                type: 'color',
                color: hex,
                blurIntensity: 10,
              })
            }
            eyedropperLabel="fondo de pantalla"
            quickSwatches={colors}
          />
        </div>
      );
    }

    // 3. Complete Animation Editor (Entrada, Salida, Combo) with Auto-Preview!
    if (toolId === 'animation') {
      return activeAnimatableClip ? (
        <AnimationsTab clip={activeAnimatableClip} />
      ) : (
        renderNoClipFallback()
      );
    }

    // 4a. Volume Tool (Only Volumen y Ganancia, Aparición y Desvanecer)
    if (toolId === 'volume') {
      return activeAudioOrVideoClip ? (
        <AudioTab clip={activeAudioOrVideoClip} volumeOnly />
      ) : (
        renderNoClipFallback()
      );
    }

    // 4b. Audio Hub (Añadir audio, Extraer de archivo de video & 50 Filtros de Voz con Previsualización)
    if (toolId === 'audio') {
      return (
        <div className="divide-y divide-white/10">
          {/* Quick Audio Actions */}
          <div className="p-4 space-y-2.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => addAudioInputRef.current?.click()}
                className="p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/35 text-emerald-200 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Music className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Añadir audio</span>
              </button>
              <input
                ref={addAudioInputRef}
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.opus,.wma,.amr,.aiff,.aif,.caf,.mp2,.ac3,.mka,.oga,.weba,.alac,.m4b,.m4r,.3ga"
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  const list = Array.from(files);
                  e.target.value = '';
                  await importMediaFiles(list, {
                    dropTime: useEditorStore.getState().currentTime,
                    forceAudio: true,
                  });
                }}
              />

              <button
                onClick={() => extractVideoInputRef.current?.click()}
                className="p-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/35 border border-violet-500/40 text-violet-200 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Upload className="w-4 h-4 text-violet-300 shrink-0" />
                <span>Extraer de archivo de video</span>
              </button>
              <input
                ref={extractVideoInputRef}
                type="file"
                multiple
                accept="video/*,.mp4,.mov,.mkv,.webm,.avi,.m4v,.3gp,.mpeg,.mpg,.ts,.flv,.wmv"
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  const list = Array.from(files);
                  e.target.value = '';
                  await extractAudioFromVideoFiles(list, {
                    dropTime: useEditorStore.getState().currentTime,
                  });
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Importa cualquier formato de audio (MP3, WAV, M4A, AAC, OGG, FLAC, etc.) o extrae solo el sonido de un video de tu galería.
            </p>
          </div>

          {/* 50 Voice Filters + Preview + Volume/Fades for active clip */}
          {activeAudioOrVideoClip ? (
            <AudioTab clip={activeAudioOrVideoClip} />
          ) : (
            <div className="p-5 text-center space-y-1.5">
              <p className="text-xs text-slate-300 font-medium">
                Añade un video o un audio a la línea de tiempo para aplicar los 50 filtros de voz y previsualizarlos.
              </p>
            </div>
          )}
        </div>
      );
    }

    // 5. Text Editor Hub
    if (toolId === 'text' || toolId === 'textEdit') {
      return (
        <div className="divide-y divide-white/10">
          <div className="px-3 py-2 bg-[#141522] flex items-center justify-between gap-2">
            <button
              onClick={handleQuickAddText}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Texto</span>
            </button>
          </div>

          {activeTextClip ? (
            <TextTab clip={activeTextClip} />
          ) : (
            <div className="p-6 text-center space-y-2">
              <p className="text-xs text-slate-400">
                Toca el botón amarillo <b>"+ Nuevo Texto"</b> arriba para agregar un título en pantalla.
              </p>
            </div>
          )}
        </div>
      );
    }

    // 6. Specific Clip Inspector Tabs
    if (toolId === 'speed') {
      return activeVisualClip ? (
        <SpeedTab clip={activeVisualClip} />
      ) : (
        renderNoClipFallback()
      );
    }
    if (toolId === 'color' || toolId === 'adjust' || toolId === 'filters') {
      return activeVisualClip ? (
        <ColorGradingTab
          clip={activeVisualClip}
          initialSubTab={toolId === 'adjust' ? 'adjust' : 'filters'}
        />
      ) : (
        renderNoClipFallback()
      );
    }
    if (toolId === 'chroma') {
      return activeVisualClip ? (
        <ChromaKeyTab clip={activeVisualClip} />
      ) : (
        renderNoClipFallback()
      );
    }
    if (toolId === 'mask') {
      return activeVisualClip ? (
        <MaskTab clip={activeVisualClip} />
      ) : (
        renderNoClipFallback()
      );
    }
    if (toolId === 'transform') {
      return activeAnimatableClip ? (
        <TransformTab clip={activeAnimatableClip} />
      ) : (
        renderNoClipFallback()
      );
    }
    if (toolId === 'keyframes') {
      return activeAnimatableClip ? (
        <KeyframeTab clip={activeAnimatableClip} />
      ) : (
        renderNoClipFallback()
      );
    }
    if (toolId === 'transitions') {
      return activeVisualClip ? (
        <TransitionsTab
          clip={activeVisualClip}
          mode="transitions"
          onSplitRevoked={handleSplitRevoked}
        />
      ) : (
        renderNoClipFallback()
      );
    }
    if (toolId === 'effects') {
      return activeVisualClip ? (
        <TransitionsTab clip={activeVisualClip} mode="fx" />
      ) : (
        renderNoClipFallback()
      );
    }

    return renderNoClipFallback();
  };

  const isTextTool = toolId === 'text' || toolId === 'textEdit';
  const isMobileLikeViewport =
    typeof window !== 'undefined' &&
    (isAndroidNativeApp() ||
      window.matchMedia?.('(pointer: coarse)')?.matches ||
      window.innerWidth < 768);
  const shouldLiftForKeyboard =
    !inline && isDrawerInputFocused && (keyboardHeightPx > 0 || isMobileLikeViewport);

  const liftedDrawerStyle: React.CSSProperties | undefined = shouldLiftForKeyboard
    ? keyboardHeightPx > 0
      ? {
          bottom: `${keyboardHeightPx}px`,
          maxHeight: `calc(100dvh - ${keyboardHeightPx}px - 52px)`,
        }
      : {
          bottom: '44vh',
          maxHeight: '46vh',
        }
    : undefined;

  return (
    <div
      ref={drawerRef}
      onFocusCapture={handleDrawerFocusCapture}
      onBlurCapture={handleDrawerBlurCapture}
      style={liftedDrawerStyle}
      className={
        eyedropperRequest
          ? 'hidden'
          : inline
            ? 'relative z-40 shrink-0 bg-[#10111a] border-t border-white/15 shadow-2xl flex flex-col max-h-[38vh] sm:max-h-[42vh] animate-slideUp'
            : isTextTool
              ? 'fixed inset-x-0 bottom-0 z-40 bg-[#10111a]/95 backdrop-blur-md border-t border-white/15 shadow-2xl flex flex-col max-h-[42vh] sm:max-h-[44vh] transition-[bottom] duration-150 animate-slideUp'
              : 'fixed inset-x-0 bottom-0 z-40 bg-[#10111a] border-t border-white/15 shadow-2xl flex flex-col max-h-[54vh] sm:max-h-[58vh] transition-[bottom] duration-150 animate-slideUp'
      }
    >
      {/* Top Action Header */}
      <div className="px-4 py-2 bg-[#0a0b12] border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs sm:text-sm text-white tracking-wide">
            {getToolTitle()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleApply}
            className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full text-xs font-bold shadow-md active:scale-95 transition-all"
            title="Aplicar cambios y guardar"
            aria-label="Aplicar cambios"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Listo</span>
          </button>
          <button
            onClick={handleCancel}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Descartar y volver a la pista de video"
            aria-label="Descartar cambios"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {renderToolContent()}
      </div>
    </div>
  );
};
