// ============================================================================
// MediaDrawer - Uploads (Video, Image, Audio), Mic Recording & Demo Clips
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '../../store/useEditorStore';
import { VoiceRecorder } from '../../core/audio/VoiceRecorder';
import { globalAudioEngine } from '../../core/audio/AudioEngine';
import { ProjectStorage } from '../../core/storage/projectStorage';
import {
  createDefaultVisualProperties,
  extractAudioFromVideoFiles,
  getNextMainTrackTime,
  importColorMaterial,
  importMediaFiles,
} from '../../core/media/importMediaFiles';
import { ColorPalettePicker } from '../Common/ColorPalettePicker';
import {
  X,
  Upload,
  Mic,
  Film,
  Music,
  Type,
  Image as ImageIcon,
  Layers,
  Palette,
  Video,
  FileAudio,
} from 'lucide-react';
import { PipOverlayIcon } from '../Timeline/CutIcons';
import { VideoClip, AudioClip, TextClip } from '../../types/editor';

type MediaTab = 'all' | 'video' | 'photo' | 'audio' | 'materials';

const BASIC_COLOR_MATERIALS: { name: string; hex: string; border?: boolean }[] = [
  { name: 'Negro', hex: '#000000', border: true },
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Gris', hex: '#6B7280' },
  { name: 'Rojo', hex: '#EF4444' },
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Verde', hex: '#22C55E' },
  { name: 'Amarillo', hex: '#EAB308' },
  { name: 'Naranja', hex: '#F97316' },
  { name: 'Violeta', hex: '#8B5CF6' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Cian', hex: '#06B6D4' },
  { name: 'Marrón', hex: '#78350F' },
];

const UPLOAD_TAB_CONFIG: Record<
  Exclude<MediaTab, 'materials'>,
  { title: string; subtitle: string; accept: string }
> = {
  all: {
    title: 'Subir Videos, Fotos o Audio',
    subtitle: 'MP4, MOV, JPG, PNG, WebP, MP3, WAV',
    accept: 'video/*,audio/*,image/*',
  },
  video: {
    title: 'Subir Videos desde tu dispositivo',
    subtitle: 'Formatos compatibles: MP4, MOV, WebM, MKV',
    accept: 'video/*',
  },
  photo: {
    title: 'Subir Fotos o Imágenes',
    subtitle: 'Formatos compatibles: JPG, PNG, WebP, GIF',
    accept: 'image/*',
  },
  audio: {
    title: 'Subir Música o Audio',
    subtitle: 'Formatos compatibles: MP3, WAV, M4A, OGG',
    accept: 'audio/*',
  },
};

export const MediaDrawer: React.FC = () => {
  const {
    isMediaDrawerOpen,
    mediaDrawerMode,
    setIsMediaDrawerOpen,
    addClip,
    showToast,
    eyedropperRequest,
  } = useEditorStore(
    useShallow((s) => ({
      isMediaDrawerOpen: s.isMediaDrawerOpen,
      mediaDrawerMode: s.mediaDrawerMode,
      setIsMediaDrawerOpen: s.setIsMediaDrawerOpen,
      addClip: s.addClip,
      showToast: s.showToast,
      eyedropperRequest: s.eyedropperRequest,
    }))
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const allFilesInputRef = useRef<HTMLInputElement | null>(null);
  const extractVideoInputRef = useRef<HTMLInputElement | null>(null);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<MediaTab>('all');
  const [materialDuration, setMaterialDuration] = useState<number>(4);
  const [customColor, setCustomColor] = useState<string>('#1E293B');
  const recorderRef = useRef<VoiceRecorder | null>(null);

  useEffect(() => {
    if (isMediaDrawerOpen && mediaDrawerMode === 'audio') {
      setActiveTab('audio');
    }
  }, [isMediaDrawerOpen, mediaDrawerMode]);

  if (!isMediaDrawerOpen) return null;

  const isPipMode = mediaDrawerMode === 'pip';
  const targetTrackId = isPipMode ? 'track_overlay' : 'track_main';
  const effectiveTab: MediaTab =
    isPipMode && activeTab === 'audio' ? 'all' : activeTab;

  // Handle Local File Upload (Video, Image, Audio)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    e.target.value = '';
    setIsMediaDrawerOpen(false);
    await importMediaFiles(
      fileList,
      isPipMode
        ? {
            targetTrackId: 'track_overlay',
            dropTime: useEditorStore.getState().currentTime,
          }
        : undefined
    );
  };

  // Extract Audio Track from Local Video File(s)
  const handleExtractAudioFromVideo = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    e.target.value = '';
    setIsExtractingAudio(true);
    try {
      await extractAudioFromVideoFiles(fileList, {
        dropTime: useEditorStore.getState().currentTime,
      });
      setIsMediaDrawerOpen(false);
    } finally {
      setIsExtractingAudio(false);
    }
  };

  const handleSelectColorMaterial = async (hex: string, name: string) => {
    setIsMediaDrawerOpen(false);
    await importColorMaterial(hex, name, materialDuration, targetTrackId);
  };

  // Toggle Live Microphone Voice Recording
  const handleToggleMic = async () => {
    if (!isRecordingMic) {
      const rec = new VoiceRecorder();
      recorderRef.current = rec;
      await rec.start();
      setIsRecordingMic(true);
    } else {
      if (recorderRef.current) {
        const result = await recorderRef.current.stop();
        setIsRecordingMic(false);

        const clipId = 'mic_' + Math.random().toString(36).substring(2, 9);
        const waveform = await globalAudioEngine.generateWaveform(
          result.url,
          60
        );

        const newClip: AudioClip = {
          id: clipId,
          trackId: 'track_audio',
          type: 'audio',
          name: '🎤 Grabación de Voz',
          sourceUrl: result.url,
          startTime: useEditorStore.getState().currentTime,
          duration: result.duration,
          sourceStartTime: 0,
          sourceDuration: result.duration,
          speed: 1,
          waveform,
          audio: {
            volume: 100,
            fadeInDuration: 0.1,
            fadeOutDuration: 0.2,
            voiceFilter: 'none',
            noiseReduction: true,
            isMuted: false,
            preservesPitch: true,
          },
        };

        addClip('track_audio', newClip);
        setIsMediaDrawerOpen(false);
        showToast('🎤 Grabación de voz añadida');
      }
    }
  };

  // Add Animated Sample Video Clip (Supports Transitions, Animations & Separate Audio!)
  const handleAddSampleVideo = () => {
    const defaults = createDefaultVisualProperties();

    if (isPipMode) {
      const clipId = 'sample_pip_' + Math.random().toString(36).substring(2, 9);
      const pipClip: VideoClip = {
        id: clipId,
        trackId: 'track_overlay',
        type: 'video',
        name: 'PIP Demo (Cyber Synth)',
        sourceUrl: 'procedural://demo1',
        startTime: Number(Math.max(0, useEditorStore.getState().currentTime).toFixed(2)),
        duration: 4.0,
        sourceStartTime: 0,
        sourceDuration: 4.0,
        naturalWidth: 1080,
        naturalHeight: 1920,
        speed: 1,
        ...defaults,
        transform: {
          ...defaults.transform,
          scale: 0.5,
          scaleX: 1,
          scaleY: 1,
          freeResize: false,
        },
        animations: {
          inType: 'zoomBounce',
          inDuration: 0.6,
          outType: 'none',
          outDuration: 0.5,
          comboType: 'none',
        },
      };
      addClip('track_overlay', pipClip);
      setIsMediaDrawerOpen(false);
      showToast('🎬 PIP Escena Demo superpuesta');
      return;
    }

    const startAt = getNextMainTrackTime();

    if (startAt === 0) {
      // Add 2 consecutive demo scenes so transitions between clips work out-of-the-box!
      const clip1Id = 'sample_vid_' + Math.random().toString(36).substring(2, 9);
      const clip2Id = 'sample_vid_' + Math.random().toString(36).substring(2, 9);

      const sampleClip1: VideoClip = {
        id: clip1Id,
        trackId: 'track_main',
        type: 'video',
        name: 'Escena #1 (Cyber Synth)',
        sourceUrl: 'procedural://demo1',
        startTime: 0,
        duration: 4.0,
        sourceStartTime: 0,
        sourceDuration: 4.0,
        naturalWidth: 1080,
        naturalHeight: 1920,
        speed: 1,
        ...defaults,
        animations: {
          inType: 'zoomBounce',
          inDuration: 0.6,
          outType: 'none',
          outDuration: 0.5,
          comboType: 'none',
        },
      };

      const sampleClip2: VideoClip = {
        id: clip2Id,
        trackId: 'track_main',
        type: 'video',
        name: 'Escena #2 (Sunset Gold)',
        sourceUrl: 'procedural://demo2',
        startTime: 4.0,
        duration: 4.0,
        sourceStartTime: 0,
        sourceDuration: 4.0,
        naturalWidth: 1080,
        naturalHeight: 1920,
        speed: 1,
        ...defaults,
        transition: {
          type: 'zoomInBlur',
          duration: 0.8,
        },
      };

      addClip('track_main', sampleClip1);
      addClip('track_main', sampleClip2);
      setIsMediaDrawerOpen(false);
      showToast('🎬 2 Escenas Demo con transición Zoom añadidas');
      return;
    }

    const clipId = 'sample_vid_' + Math.random().toString(36).substring(2, 9);
    const sampleClip: VideoClip = {
      id: clipId,
      trackId: 'track_main',
      type: 'video',
      name: `Escena #${Math.round(startAt / 4) + 1} (Neón)`,
      sourceUrl: 'procedural://demo',
      startTime: startAt,
      duration: 4.0,
      sourceStartTime: 0,
      sourceDuration: 4.0,
      naturalWidth: 1080,
      naturalHeight: 1920,
      speed: 1,
      ...defaults,
      transition: {
        type: 'cube3D',
        duration: 0.8,
      },
      animations: {
        inType: 'zoomBounce',
        inDuration: 0.6,
        outType: 'fadeOut',
        outDuration: 0.5,
        comboType: 'none',
      },
    };

    addClip('track_main', sampleClip);
    setIsMediaDrawerOpen(false);
    showToast('🎬 Escena Demo con transición 3D añadida');
  };

  const handleAddSampleAudio = async () => {
    globalAudioEngine.init();
    const { url, blob, duration, waveform } =
      await globalAudioEngine.generateSynthesizedSFX('beat');
    const clipId = 'aud_demo_' + Math.random().toString(36).substring(2, 9);
    await ProjectStorage.saveMediaBlob(clipId, blob, url);

    const newAudio: AudioClip = {
      id: clipId,
      trackId: 'track_audio',
      type: 'audio',
      name: '🎵 Ritmo Electrónico 120 BPM',
      sourceUrl: url,
      startTime: Number(Math.max(0, useEditorStore.getState().currentTime).toFixed(2)),
      duration,
      sourceStartTime: 0,
      sourceDuration: duration,
      speed: 1,
      waveform,
      audio: {
        volume: 100,
        fadeInDuration: 0.2,
        fadeOutDuration: 0.3,
        voiceFilter: 'none',
        noiseReduction: false,
        isMuted: false,
        preservesPitch: true,
      },
    };
    addClip('track_audio', newAudio);
    setIsMediaDrawerOpen(false);
    showToast('🎵 Música de muestra añadida');
  };

  const handleAddSampleText = () => {
    const textClip: TextClip = {
      id: 'txt_' + Math.random().toString(36).substring(2, 9),
      trackId: 'track_text',
      type: 'text',
      name: 'Texto: ¡Título Épico!',
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
      },
      animations: {
        inType: 'fadeIn',
        inDuration: 0.4,
        outType: 'fadeOut',
        outDuration: 0.4,
        comboType: 'heartbeat',
      },
      textConfig: {
        text: '¡EDICIÓN PRO!',
        fontFamily: 'Inter',
        fontSize: 140,
        fontWeight: 900,
        color: '#ffffff',
        gradientFill: {
          start: '#f43f5e',
          end: '#fbbf24',
          angle: 90,
        },
        alignment: 'center',
        letterSpacing: 2,
        lineHeight: 1.1,
        curved: false,
        curveRadius: 0,
        strokeWidth: 4,
        strokeColor: '#000000',
        shadowColor: 'rgba(0,0,0,0.9)',
        shadowBlur: 12,
        shadowDistance: 5,
        shadowAngle: 45,
        hasBackground: false,
        backgroundColor: '#090a0f',
        backgroundOpacity: 0,
        backgroundPadding: 16,
        borderRadius: 12,
        animIn: 'typewriter',
        animInDuration: 1.2,
        animLoop: 'heartbeat',
        animLoopSpeed: 1,
      },
    };

    addClip('track_text', textClip);
    setIsMediaDrawerOpen(false);
    showToast('🔤 Texto animado añadido');
  };

  const allTabs: { id: MediaTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Todas', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'video', label: 'Video', icon: <Video className="w-3.5 h-3.5" /> },
    { id: 'photo', label: 'Foto', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'audio', label: 'Audio', icon: <Music className="w-3.5 h-3.5" /> },
    {
      id: 'materials',
      label: 'Materiales',
      icon: <Palette className="w-3.5 h-3.5" />,
    },
  ];

  const tabs = isPipMode
    ? allTabs.filter((tab) => tab.id !== 'audio')
    : allTabs;

  const uploadConfig =
    effectiveTab !== 'materials'
      ? isPipMode && effectiveTab === 'all'
        ? {
            title: 'Subir Videos o Fotos (PIP)',
            subtitle: 'Acceso completo: Descargas, Telegram, Galería, Archivos',
            accept: undefined,
          }
        : UPLOAD_TAB_CONFIG[effectiveTab]
      : null;

  return (
    <div
      className={
        eyedropperRequest
          ? 'hidden'
          : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none'
      }
    >
      <div className="w-full max-w-lg bg-[#12131e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            {isPipMode ? (
              <>
                <PipOverlayIcon className="w-4 h-4 text-orange-400" />
                <span>Agregar Superposición (PIP)</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">
                  Sobre pista principal
                </span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Agregar Contenido Multimedia</span>
              </>
            )}
          </h2>
          <button
            onClick={() => setIsMediaDrawerOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-white/10 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = effectiveTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 text-xs overflow-y-auto">
          {effectiveTab === 'materials' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-300 text-[11px]">
                  {isPipMode
                    ? 'Bloques de colores sólidos para superponer sobre la pista principal:'
                    : 'Bloques de colores sólidos para usar como fondo o agregar texto encima:'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {[3, 4, 5, 10].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setMaterialDuration(sec)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                        materialDuration === sec
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Color Blocks Grid */}
              <div className="grid grid-cols-4 gap-2">
                {BASIC_COLOR_MATERIALS.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() =>
                      handleSelectColorMaterial(color.hex, color.name)
                    }
                    className="group flex flex-col items-center gap-1.5 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/60 transition-all active:scale-95"
                  >
                    <div
                      className={`w-full h-11 rounded-md shadow-inner transition-transform group-hover:scale-[1.03] ${
                        color.border ? 'border border-white/25' : ''
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-[11px] font-medium text-slate-200">
                      {color.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Color Palette + Eyedropper (Cuentagotas) */}
              <div className="pt-2.5 border-t border-white/10 space-y-2.5">
                <ColorPalettePicker
                  value={customColor}
                  onChange={setCustomColor}
                  label="Color:"
                  eyedropperLabel="color de material"
                  reopenMediaDrawer={true}
                  defaultPanel="picker"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-md border border-white/25 shadow-inner shrink-0"
                      style={{ backgroundColor: customColor }}
                    />
                    <span className="text-[11px] text-slate-300 font-mono uppercase">
                      {customColor}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectColorMaterial(
                        customColor,
                        `Color ${customColor.toUpperCase()}`
                      )
                    }
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
                  >
                    Agregar material
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Upload Local File Box */}
              {uploadConfig && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-xl border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 bg-indigo-950/20 hover:bg-indigo-950/40 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all group"
                >
                  <Upload className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-slate-100 text-sm text-center">
                    {uploadConfig.title}
                  </span>
                  <span className="text-slate-400 text-[11px] text-center">
                    Toca para seleccionar archivos desde tu dispositivo (
                    {uploadConfig.subtitle})
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={isPipMode ? undefined : uploadConfig.accept}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              )}

              {/* Full device file explorer (bypasses mobile Photo Picker restrictions) */}
              {!isPipMode && (
                <>
                  <button
                    onClick={() => allFilesInputRef.current?.click()}
                    className="w-full p-2.5 rounded-lg font-medium flex items-center justify-center gap-2 border bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>
                      Explorar todos los archivos (Descargas, Telegram, Carpetas...)
                    </span>
                  </button>
                  <input
                    ref={allFilesInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </>
              )}

              {/* Extract Audio from Video File */}
              {!isPipMode &&
                (effectiveTab === 'all' || effectiveTab === 'audio') && (
                <>
                  <button
                    onClick={() => extractVideoInputRef.current?.click()}
                    disabled={isExtractingAudio}
                    className="w-full p-3 rounded-lg font-semibold flex items-center justify-center gap-2 border bg-indigo-600/20 border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/30 transition-all disabled:opacity-60"
                  >
                    <FileAudio className="w-4 h-4 text-indigo-300" />
                    <span>
                      {isExtractingAudio
                        ? 'Extrayendo audio del video...'
                        : 'Extraer Audio de un Video (MP4, MOV, WebM...)'}
                    </span>
                  </button>
                  <input
                    ref={extractVideoInputRef}
                    type="file"
                    multiple
                    accept="video/*"
                    className="hidden"
                    onChange={handleExtractAudioFromVideo}
                  />
                </>
              )}

              {/* Record Microphone Voiceover */}
              {!isPipMode &&
                (effectiveTab === 'all' || effectiveTab === 'audio') && (
                <button
                  onClick={handleToggleMic}
                  className={`w-full p-3 rounded-lg font-semibold flex items-center justify-center gap-2 border transition-all ${
                    isRecordingMic
                      ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                      : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Mic className="w-4 h-4 text-rose-400" />
                  <span>
                    {isRecordingMic
                      ? 'Detener y Guardar Grabación'
                      : 'Grabar Voz en Vivo con Micrófono'}
                  </span>
                </button>
              )}

              {/* Quick Starter Presets */}
              {(effectiveTab === 'all' ||
                effectiveTab === 'video' ||
                (!isPipMode && effectiveTab === 'audio')) && (
                <div className="pt-2 border-t border-white/10">
                  <span className="text-slate-400 font-semibold mb-2 block">
                    Elementos Rápidos de Prueba (1 Clic):
                  </span>
                  <div
                    className={`grid gap-2 ${
                      isPipMode ? 'grid-cols-1' : 'grid-cols-3'
                    }`}
                  >
                    {(effectiveTab === 'all' || effectiveTab === 'video') && (
                      <button
                        onClick={handleAddSampleVideo}
                        className="p-2.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 font-semibold flex flex-col items-center gap-1 transition-colors"
                      >
                        <Film className="w-4 h-4 text-indigo-400" />
                        <span>{isPipMode ? '+ Clip Demo (PIP)' : '+ Clip Demo'}</span>
                      </button>
                    )}

                    {!isPipMode &&
                      (effectiveTab === 'all' || effectiveTab === 'audio') && (
                      <button
                        onClick={handleAddSampleAudio}
                        className="p-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-200 font-semibold flex flex-col items-center gap-1 transition-colors"
                      >
                        <Music className="w-4 h-4 text-emerald-400" />
                        <span>+ Música Beat</span>
                      </button>
                    )}

                    {!isPipMode && effectiveTab === 'all' && (
                      <button
                        onClick={handleAddSampleText}
                        className="p-2.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-200 font-semibold flex flex-col items-center gap-1 transition-colors"
                      >
                        <Type className="w-4 h-4 text-amber-400" />
                        <span>+ Texto Viral</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
