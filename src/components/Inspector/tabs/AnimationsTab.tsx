// ============================================================================
// AnimationsTab - 3D Perspective, Motion-Blur Whip & Spring Physics Animations
// ============================================================================

import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  VideoClip,
  TextClip,
  AnimationInType,
  AnimationOutType,
  AnimationComboType,
} from '../../../types/editor';
import { useEditorStore } from '../../../store/useEditorStore';
import { globalAudioEngine } from '../../../core/audio/AudioEngine';
import { Play, CheckCheck, RotateCcw } from 'lucide-react';
import { HorizontalScrollRow } from '../../Editor/HorizontalScrollRow';

interface AnimationsTabProps {
  clip: VideoClip | TextClip;
}

const inOptions: {
    id: AnimationInType;
    label: string;
    badge: string;
    icon: string;
    gradient: string;
  }[] = [
    {
      id: 'none',
      label: 'Sin Entrada',
      badge: 'Normal',
      icon: '⊘',
      gradient: 'from-slate-800 to-slate-900',
    },
    {
      id: 'zoomBounce',
      label: 'Zoom Rebote Pro',
      badge: 'Resorte',
      icon: '🎯',
      gradient: 'from-indigo-600 to-cyan-500',
    },
    {
      id: 'elasticPop',
      label: 'Pop Elástico',
      badge: 'Spring',
      icon: '🫧',
      gradient: 'from-fuchsia-600 to-pink-500',
    },
    {
      id: 'zoomIn',
      label: 'Zoom Acercar + Blur',
      badge: 'Radial Blur',
      icon: '🔍',
      gradient: 'from-blue-600 to-indigo-600',
    },
    {
      id: 'zoomOut',
      label: 'Zoom Contraer + Blur',
      badge: 'Impacto',
      icon: '💥',
      gradient: 'from-violet-600 to-purple-700',
    },
    {
      id: 'whipLeft',
      label: 'Whip Slide Izquierda',
      badge: 'Motion Blur',
      icon: '💨',
      gradient: 'from-purple-600 to-pink-600',
    },
    {
      id: 'whipRight',
      label: 'Whip Slide Derecha',
      badge: 'Motion Blur',
      icon: '⏩',
      gradient: 'from-pink-600 to-rose-600',
    },
    {
      id: 'flip3D',
      label: 'Volteo 3D Real',
      badge: 'Perspectiva 3D',
      icon: '🔄',
      gradient: 'from-emerald-600 to-teal-700',
    },
    {
      id: 'swing3D',
      label: 'Columpio 3D',
      badge: 'Péndulo 3D',
      icon: '🚪',
      gradient: 'from-teal-600 to-cyan-700',
    },
    {
      id: 'tilt3D',
      label: 'Abatimiento 3D',
      badge: 'Eje X 3D',
      icon: '📐',
      gradient: 'from-cyan-600 to-blue-700',
    },
    {
      id: 'vortexIn',
      label: 'Vórtice Espiral 720°',
      badge: 'Giro Rápido',
      icon: '🌀',
      gradient: 'from-indigo-600 to-violet-700',
    },
    {
      id: 'spin',
      label: 'Giro Dinámico 360°',
      badge: 'Rotación',
      icon: '💫',
      gradient: 'from-sky-600 to-indigo-600',
    },
    {
      id: 'dropBounce',
      label: 'Caída con Impacto',
      badge: 'Gravedad',
      icon: '☄️',
      gradient: 'from-amber-500 to-red-600',
    },
    {
      id: 'bounce',
      label: 'Rebote Elástico',
      badge: 'Squash',
      icon: '🏀',
      gradient: 'from-orange-500 to-amber-600',
    },
    {
      id: 'glitchIn',
      label: 'Entrada Glitch RGB',
      badge: 'Cyberpunk',
      icon: '⚡',
      gradient: 'from-fuchsia-600 via-purple-600 to-cyan-500',
    },
    {
      id: 'blurIn',
      label: 'Enfoque Suave',
      badge: 'Blur Focus',
      icon: '✨',
      gradient: 'from-slate-600 to-indigo-600',
    },
    {
      id: 'slideUp',
      label: 'Deslizar Arriba',
      badge: 'Slide + Blur',
      icon: '⬆️',
      gradient: 'from-blue-700 to-indigo-600',
    },
    {
      id: 'slideDown',
      label: 'Deslizar Abajo',
      badge: 'Slide + Blur',
      icon: '⬇️',
      gradient: 'from-indigo-700 to-blue-600',
    },
    {
      id: 'slideLeft',
      label: 'Deslizar Izquierda',
      badge: 'Slide + Blur',
      icon: '⬅️',
      gradient: 'from-violet-700 to-indigo-600',
    },
    {
      id: 'slideRight',
      label: 'Deslizar Derecha',
      badge: 'Slide + Blur',
      icon: '➡️',
      gradient: 'from-indigo-600 to-violet-700',
    },
    {
      id: 'fadeIn',
      label: 'Aparición Cine',
      badge: 'Fade Suave',
      icon: '🌅',
      gradient: 'from-zinc-600 to-slate-700',
    },
    {
      id: 'whipUp',
      label: 'Whip Slide Arriba',
      badge: 'Motion Blur',
      icon: '⬆️',
      gradient: 'from-indigo-600 to-cyan-600',
    },
    {
      id: 'whipDown',
      label: 'Whip Slide Abajo',
      badge: 'Motion Blur',
      icon: '⬇️',
      gradient: 'from-cyan-600 to-blue-700',
    },
    {
      id: 'popRotate',
      label: 'Pop + Giro 45°',
      badge: 'Spring Snap',
      icon: '✨',
      gradient: 'from-amber-500 to-pink-600',
    },
    {
      id: 'flip3DY',
      label: 'Volteo 3D Vertical',
      badge: 'Eje X 3D',
      icon: '🔃',
      gradient: 'from-teal-600 to-emerald-700',
    },
    {
      id: 'rollInLeft',
      label: 'Rodar Izquierda',
      badge: 'Roll + Blur',
      icon: '🎡',
      gradient: 'from-violet-600 to-purple-700',
    },
    {
      id: 'rollInRight',
      label: 'Rodar Derecha',
      badge: 'Roll + Blur',
      icon: '🎡',
      gradient: 'from-purple-600 to-fuchsia-700',
    },
    {
      id: 'stretchInH',
      label: 'Estirar Horizontal',
      badge: 'Squash & Stretch',
      icon: '↔️',
      gradient: 'from-pink-600 to-rose-600',
    },
    {
      id: 'stretchInV',
      label: 'Estirar Vertical',
      badge: 'Squash & Stretch',
      icon: '↕️',
      gradient: 'from-rose-600 to-orange-600',
    },
    {
      id: 'flashIn',
      label: 'Entrada Destello',
      badge: 'Flash Impact',
      icon: '⚡',
      gradient: 'from-amber-400 to-orange-600',
    },
    {
      id: 'shakeIn',
      label: 'Entrada Terremoto',
      badge: 'Vibración',
      icon: '📳',
      gradient: 'from-red-600 to-amber-600',
    },
    {
      id: 'pendulumIn',
      label: 'Entrada Péndulo',
      badge: 'Oscilación',
      icon: '🕰️',
      gradient: 'from-sky-600 to-indigo-700',
    },
    {
      id: 'spiralZoom',
      label: 'Espiral Zoom 180°',
      badge: 'Zoom + Giro',
      icon: '🌀',
      gradient: 'from-fuchsia-600 to-indigo-700',
    },
    {
      id: 'unfold3D',
      label: 'Despliegue 3D',
      badge: 'Perspectiva',
      icon: '📐',
      gradient: 'from-emerald-600 to-cyan-700',
    },
    {
      id: 'cinemaZoomIn',
      label: 'Zoom Cine Lento',
      badge: 'Óptico Suave',
      icon: '🎬',
      gradient: 'from-slate-600 to-indigo-800',
    },
  ];

  const outOptions: {
    id: AnimationOutType;
    label: string;
    badge: string;
    icon: string;
    gradient: string;
  }[] = [
    {
      id: 'none',
      label: 'Sin Salida',
      badge: 'Normal',
      icon: '⊘',
      gradient: 'from-slate-800 to-slate-900',
    },
    {
      id: 'zoomOut',
      label: 'Contraer + Blur',
      badge: 'Zoom Out',
      icon: '🎯',
      gradient: 'from-pink-600 to-rose-700',
    },
    {
      id: 'zoomIn',
      label: 'Expandir Hacia Cámara',
      badge: 'Zoom In',
      icon: '🔍',
      gradient: 'from-fuchsia-600 to-purple-700',
    },
    {
      id: 'whipOutLeft',
      label: 'Whip Salida Izq',
      badge: 'Motion Blur',
      icon: '💨',
      gradient: 'from-rose-600 to-orange-600',
    },
    {
      id: 'whipOutRight',
      label: 'Whip Salida Der',
      badge: 'Motion Blur',
      icon: '⏩',
      gradient: 'from-orange-600 to-amber-600',
    },
    {
      id: 'flip3DOut',
      label: 'Volteo 3D Salida',
      badge: 'Perspectiva 3D',
      icon: '🔄',
      gradient: 'from-emerald-600 to-teal-700',
    },
    {
      id: 'vortexOut',
      label: 'Vórtice Salida 720°',
      badge: 'Espiral',
      icon: '🌀',
      gradient: 'from-violet-600 to-indigo-700',
    },
    {
      id: 'spin',
      label: 'Giro de Salida',
      badge: '360°',
      icon: '💫',
      gradient: 'from-indigo-600 to-blue-700',
    },
    {
      id: 'glitchOut',
      label: 'Desintegración Glitch',
      badge: 'Cyberpunk',
      icon: '⚡',
      gradient: 'from-pink-600 to-cyan-600',
    },
    {
      id: 'blurOut',
      label: 'Desenfoque Suave',
      badge: 'Blur Out',
      icon: '🌫️',
      gradient: 'from-slate-600 to-purple-700',
    },
    {
      id: 'slideDown',
      label: 'Caída Hacia Abajo',
      badge: 'Slide Out',
      icon: '⬇️',
      gradient: 'from-rose-700 to-pink-600',
    },
    {
      id: 'slideUp',
      label: 'Subir Hacia Arriba',
      badge: 'Slide Out',
      icon: '⬆️',
      gradient: 'from-pink-700 to-rose-600',
    },
    {
      id: 'slideLeft',
      label: 'Salir por Izquierda',
      badge: 'Slide Out',
      icon: '⬅️',
      gradient: 'from-purple-700 to-pink-600',
    },
    {
      id: 'slideRight',
      label: 'Salir por Derecha',
      badge: 'Slide Out',
      icon: '➡️',
      gradient: 'from-pink-600 to-purple-700',
    },
    {
      id: 'fadeOut',
      label: 'Desvanecer Suave',
      badge: 'Fade Out',
      icon: '🌑',
      gradient: 'from-zinc-700 to-slate-800',
    },
    {
      id: 'whipOutUp',
      label: 'Whip Salida Arriba',
      badge: 'Motion Blur',
      icon: '⬆️',
      gradient: 'from-rose-600 to-indigo-600',
    },
    {
      id: 'whipOutDown',
      label: 'Whip Salida Abajo',
      badge: 'Motion Blur',
      icon: '⬇️',
      gradient: 'from-orange-600 to-rose-700',
    },
    {
      id: 'flip3DOutY',
      label: 'Volteo 3D Vertical',
      badge: 'Eje X 3D',
      icon: '🔃',
      gradient: 'from-teal-600 to-cyan-700',
    },
    {
      id: 'rollOutLeft',
      label: 'Rodar Salida Izq',
      badge: 'Roll Out',
      icon: '🎡',
      gradient: 'from-purple-600 to-indigo-700',
    },
    {
      id: 'rollOutRight',
      label: 'Rodar Salida Der',
      badge: 'Roll Out',
      icon: '🎡',
      gradient: 'from-fuchsia-600 to-purple-700',
    },
    {
      id: 'stretchOutH',
      label: 'Encoger Horizontal',
      badge: 'Squash Out',
      icon: '↔️',
      gradient: 'from-pink-600 to-rose-700',
    },
    {
      id: 'stretchOutV',
      label: 'Encoger Vertical',
      badge: 'Squash Out',
      icon: '↕️',
      gradient: 'from-rose-600 to-amber-600',
    },
    {
      id: 'flashOut',
      label: 'Salida Destello',
      badge: 'Flash Out',
      icon: '⚡',
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      id: 'shakeOut',
      label: 'Salida Terremoto',
      badge: 'Vibración',
      icon: '📳',
      gradient: 'from-red-600 to-orange-700',
    },
    {
      id: 'dropOut',
      label: 'Caída Gravedad',
      badge: 'Drop + Blur',
      icon: '☄️',
      gradient: 'from-amber-600 to-red-700',
    },
    {
      id: 'popOut',
      label: 'Pop Salida',
      badge: 'Elastic Out',
      icon: '🫧',
      gradient: 'from-fuchsia-600 to-pink-600',
    },
    {
      id: 'spiralOut',
      label: 'Espiral Salida',
      badge: 'Zoom + Giro',
      icon: '🌀',
      gradient: 'from-indigo-600 to-violet-700',
    },
  ];

  const comboOptions: {
    id: AnimationComboType;
    label: string;
    badge: string;
    icon: string;
    gradient: string;
  }[] = [
    {
      id: 'none',
      label: 'Sin Combo',
      badge: 'Estático',
      icon: '⊘',
      gradient: 'from-slate-800 to-slate-900',
    },
    {
      id: 'swing3DLoop',
      label: 'Balanceo 3D Continuo',
      badge: 'Perspectiva 3D',
      icon: '🧊',
      gradient: 'from-emerald-600 to-cyan-600',
    },
    {
      id: 'heartbeat',
      label: 'Latido Cardíaco Pro',
      badge: 'Doble Pulso',
      icon: '💓',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      id: 'zoomPulse',
      label: 'Pulso de Zoom + Blur',
      badge: 'Rítmico',
      icon: '🔊',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      id: 'neonPulse',
      label: 'Destello Rítmico',
      badge: 'Flash Beat',
      icon: '⚡',
      gradient: 'from-fuchsia-600 to-cyan-500',
    },
    {
      id: 'floating',
      label: 'Flotación 3D Suave',
      badge: 'Ingravidez',
      icon: '🛸',
      gradient: 'from-sky-600 to-indigo-600',
    },
    {
      id: 'cinemaPan',
      label: 'Paneo Ken Burns',
      badge: 'Cine Documental',
      icon: '🎥',
      gradient: 'from-amber-600 to-orange-700',
    },
    {
      id: 'handheldCam',
      label: 'Cámara en Mano',
      badge: 'Realista',
      icon: '📹',
      gradient: 'from-teal-600 to-slate-700',
    },
    {
      id: 'glitchFlash',
      label: 'Bucle Glitch Cyber',
      badge: 'Viral',
      icon: '👾',
      gradient: 'from-purple-600 to-pink-600',
    },
    {
      id: 'shake',
      label: 'Terremoto Continuo',
      badge: 'Energético',
      icon: '📳',
      gradient: 'from-red-600 to-orange-600',
    },
    {
      id: 'pendulum',
      label: 'Péndulo Oscilante',
      badge: 'Vaivén',
      icon: '🕰️',
      gradient: 'from-violet-600 to-indigo-700',
    },
    {
      id: 'rubberBand',
      label: 'Banda Elástica',
      badge: 'Squash & Stretch',
      icon: '🪢',
      gradient: 'from-pink-500 to-amber-500',
    },
    {
      id: 'discoSpin',
      label: 'Giro Disco 3D',
      badge: 'Fiesta',
      icon: '🪩',
      gradient: 'from-cyan-500 to-fuchsia-600',
    },
    {
      id: 'breathe',
      label: 'Respiración Zen',
      badge: 'Suave',
      icon: '🍃',
      gradient: 'from-emerald-600 to-teal-800',
    },
    {
      id: 'bounceLoop',
      label: 'Rebote Rítmico',
      badge: 'Saltos',
      icon: '🏀',
      gradient: 'from-orange-500 to-rose-600',
    },
    {
      id: 'spin360Loop',
      label: 'Giro Continuo 360°',
      badge: 'Rotación',
      icon: '🔄',
      gradient: 'from-blue-600 to-indigo-700',
    },
    {
      id: 'flip3DLoop',
      label: 'Volteo 3D Continuo',
      badge: 'Eje Y 3D',
      icon: '🪙',
      gradient: 'from-amber-500 to-yellow-700',
    },
    {
      id: 'figure8',
      label: 'Movimiento en 8',
      badge: 'Lissajous',
      icon: '♾️',
      gradient: 'from-cyan-600 to-blue-700',
    },
    {
      id: 'orbit3D',
      label: 'Órbita 3D',
      badge: 'Espacial',
      icon: '🪐',
      gradient: 'from-violet-600 to-purple-800',
    },
    {
      id: 'strobeFlash',
      label: 'Destello Estrobo',
      badge: 'Club Beat',
      icon: '🚨',
      gradient: 'from-fuchsia-600 to-rose-600',
    },
    {
      id: 'wobble',
      label: 'Gelatina Wobble',
      badge: 'Elástico',
      icon: '🍮',
      gradient: 'from-pink-500 to-orange-500',
    },
    {
      id: 'zoomInSlow',
      label: 'Zoom In Progresivo',
      badge: 'Ken Burns +',
      icon: '🔍',
      gradient: 'from-indigo-600 to-sky-600',
    },
    {
      id: 'zoomOutSlow',
      label: 'Zoom Out Progresivo',
      badge: 'Ken Burns -',
      icon: '🔭',
      gradient: 'from-sky-600 to-teal-700',
    },
    {
      id: 'panLeftSlow',
      label: 'Paneo Izquierda',
      badge: 'Cámara Lenta',
      icon: '⬅️',
      gradient: 'from-slate-600 to-indigo-700',
    },
    {
      id: 'panRightSlow',
      label: 'Paneo Derecha',
      badge: 'Cámara Lenta',
      icon: '➡️',
      gradient: 'from-indigo-700 to-slate-600',
    },
    {
      id: 'flicker',
      label: 'Parpadeo Cine',
      badge: 'Proyector',
      icon: '📽️',
      gradient: 'from-amber-700 to-stone-800',
    },
    {
      id: 'turbulence',
      label: 'Turbulencia Acción',
      badge: 'Caos + Blur',
      icon: '🌪️',
      gradient: 'from-red-600 to-purple-700',
    },
  ];

export const AnimationsTab: React.FC<AnimationsTabProps> = ({ clip }) => {
  const {
    updateClip,
    updateAllVisualClips,
    setCurrentTime,
    setIsPlaying,
    showToast,
  } = useEditorStore(
    useShallow((s) => ({
      updateClip: s.updateClip,
      updateAllVisualClips: s.updateAllVisualClips,
      setCurrentTime: s.setCurrentTime,
      setIsPlaying: s.setIsPlaying,
      showToast: s.showToast,
    }))
  );

  const [animTab, setAnimTab] = useState<'in' | 'out' | 'combo'>('in');

  const currentAnims = clip.animations || {
    inType: 'none',
    inDuration: 0.6,
    outType: 'none',
    outDuration: 0.6,
    comboType: 'none',
  };

  const applyAndPreviewAnim = (
    updates: Partial<typeof currentAnims>,
    previewMode: 'in' | 'out' | 'combo'
  ) => {
    const merged = { ...currentAnims, ...updates };
    updateClip(clip.id, { animations: merged });
    globalAudioEngine.init();

    if (previewMode === 'in' && merged.inType !== 'none') {
      setCurrentTime(clip.startTime);
      setIsPlaying(true);
      const found = inOptions.find((o) => o.id === merged.inType);
      showToast(`🎬 Entrada "${found?.label || merged.inType}" aplicada`);
    } else if (previewMode === 'out' && merged.outType !== 'none') {
      const seekTo = Math.max(
        clip.startTime,
        clip.startTime + clip.duration - (merged.outDuration || 0.6) - 0.25
      );
      setCurrentTime(seekTo);
      setIsPlaying(true);
      const found = outOptions.find((o) => o.id === merged.outType);
      showToast(`🎬 Salida "${found?.label || merged.outType}" aplicada`);
    } else if (previewMode === 'combo' && merged.comboType !== 'none') {
      setCurrentTime(clip.startTime);
      setIsPlaying(true);
      const found = comboOptions.find((o) => o.id === merged.comboType);
      showToast(`🎬 Combo "${found?.label || merged.comboType}" activado`);
    }
  };

  const applyAnimationsToAllClips = () => {
    updateAllVisualClips(
      { animations: { ...currentAnims } },
      { includeText: true }
    );
    showToast('🎬 Animaciones aplicadas a todos los clips visuales');
  };

  const resetAnimations = () => {
    updateClip(clip.id, {
      animations: {
        inType: 'none',
        inDuration: 0.6,
        outType: 'none',
        outDuration: 0.6,
        comboType: 'none',
      },
    });
    showToast('Animaciones restablecidas');
  };

  return (
    <div className="p-3.5 space-y-3 text-xs text-slate-300">
      {/* Sub-tabs: Entrada / Salida / Combo */}
      <div className="flex bg-[#141622] p-1 rounded-xl border border-white/10">
        {[
          { id: 'in', label: `Entrada (${inOptions.length - 1})` },
          { id: 'out', label: `Salida (${outOptions.length - 1})` },
          { id: 'combo', label: `Combo Bucle (${comboOptions.length - 1})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAnimTab(tab.id as any)}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              animTab === tab.id
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {animTab === 'in' && (
        <>
          <HorizontalScrollRow>
            {inOptions.map((a) => {
              const isSelected = currentAnims.inType === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() =>
                    applyAndPreviewAnim(
                      {
                        inType: a.id,
                        inDuration: currentAnims.inDuration || 0.6,
                      },
                      'in'
                    )
                  }
                  className={`shrink-0 w-[138px] sm:w-[148px] snap-start p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400'
                      : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg bg-gradient-to-br ${a.gradient} flex items-center justify-center text-base shrink-0 shadow-inner border border-white/15`}
                  >
                    {a.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[11px] truncate">
                      {a.label}
                    </div>
                    <div className="text-[9px] text-indigo-300/90 truncate">
                      {a.badge}
                    </div>
                  </div>
                </button>
              );
            })}
          </HorizontalScrollRow>

          {currentAnims.inType !== 'none' && (
            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between text-slate-300 font-semibold mb-1">
                <span>Duración de Entrada</span>
                <span className="font-mono text-indigo-400 font-bold">
                  {(currentAnims.inDuration || 0.6).toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={currentAnims.inDuration || 0.6}
                onChange={(e) =>
                  applyAndPreviewAnim(
                    { inDuration: Number(e.target.value) },
                    'in'
                  )
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          )}
        </>
      )}

      {animTab === 'out' && (
        <>
          <HorizontalScrollRow>
            {outOptions.map((a) => {
              const isSelected = currentAnims.outType === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() =>
                    applyAndPreviewAnim(
                      {
                        outType: a.id,
                        outDuration: currentAnims.outDuration || 0.6,
                      },
                      'out'
                    )
                  }
                  className={`shrink-0 w-[138px] sm:w-[148px] snap-start p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-pink-600/30 border-pink-400 text-white shadow-lg ring-1 ring-pink-400'
                      : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg bg-gradient-to-br ${a.gradient} flex items-center justify-center text-base shrink-0 shadow-inner border border-white/15`}
                  >
                    {a.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[11px] truncate">
                      {a.label}
                    </div>
                    <div className="text-[9px] text-pink-300/90 truncate">
                      {a.badge}
                    </div>
                  </div>
                </button>
              );
            })}
          </HorizontalScrollRow>

          {currentAnims.outType !== 'none' && (
            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between text-slate-300 font-semibold mb-1">
                <span>Duración de Salida</span>
                <span className="font-mono text-pink-400 font-bold">
                  {(currentAnims.outDuration || 0.6).toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={currentAnims.outDuration || 0.6}
                onChange={(e) =>
                  applyAndPreviewAnim(
                    { outDuration: Number(e.target.value) },
                    'out'
                  )
                }
                className="w-full accent-pink-500 cursor-pointer"
              />
            </div>
          )}
        </>
      )}

      {animTab === 'combo' && (
        <HorizontalScrollRow>
          {comboOptions.map((a) => {
            const isSelected = currentAnims.comboType === a.id;
            return (
              <button
                key={a.id}
                onClick={() =>
                  applyAndPreviewAnim({ comboType: a.id }, 'combo')
                }
                className={`shrink-0 w-[138px] sm:w-[148px] snap-start p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-purple-600/30 border-purple-400 text-white shadow-lg ring-1 ring-purple-400'
                    : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/10'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg bg-gradient-to-br ${a.gradient} flex items-center justify-center text-base shrink-0 shadow-inner border border-white/15`}
                >
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[11px] truncate">{a.label}</div>
                  <div className="text-[9px] text-purple-300/90 truncate">
                    {a.badge}
                  </div>
                </div>
              </button>
            );
          })}
        </HorizontalScrollRow>
      )}

      {/* Action Footer */}
      {(currentAnims.inType !== 'none' ||
        currentAnims.outType !== 'none' ||
        currentAnims.comboType !== 'none') && (
        <div className="pt-2 border-t border-white/10 flex items-center gap-2">
          <button
            onClick={() => {
              globalAudioEngine.init();
              setCurrentTime(clip.startTime);
              setIsPlaying(true);
            }}
            className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600/25 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/40 font-bold flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Previsualizar Clip</span>
          </button>
          <button
            onClick={applyAnimationsToAllClips}
            className="flex-1 py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 font-bold flex items-center justify-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aplicar a Todos</span>
          </button>
          <button
            onClick={resetAnimations}
            className="py-1.5 px-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 font-semibold flex items-center justify-center"
            title="Quitar animaciones"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
