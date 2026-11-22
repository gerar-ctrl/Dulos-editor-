// ============================================================================
// TransformTab - Screen Fit/Fill, Flip, Rotate 90°, Scale, Position & Opacity
// ============================================================================

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  VideoClip,
  TextClip,
  BlendMode,
  ScaleFitMode,
} from '../../../types/editor';
import { useEditorStore } from '../../../store/useEditorStore';
import { interpolateClipTransform } from '../../../core/keyframes/interpolateKeyframes';
import {
  Maximize,
  Minimize,
  Move,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crosshair,
  Hand,
  Lock,
} from 'lucide-react';

interface TransformTabProps {
  clip: VideoClip | TextClip;
}

export const TransformTab: React.FC<TransformTabProps> = ({ clip }) => {
  const hasKeyframes =
    (clip.type === 'video' || clip.type === 'image') &&
    Boolean((clip as VideoClip).keyframes?.length);
  const { updateClip, showToast, currentTime } = useEditorStore(
    useShallow((s) => ({
      updateClip: s.updateClip,
      showToast: s.showToast,
      currentTime: hasKeyframes ? s.currentTime : 0,
    }))
  );
  const t = interpolateClipTransform(
    clip,
    Math.max(0, currentTime - clip.startTime)
  );
  const scaleX = t.scaleX ?? 1;
  const scaleY = t.scaleY ?? 1;
  const isFreeResize = t.freeResize === true;

  const handleUpdate = (partial: Partial<typeof t>) => {
    updateClip(clip.id, { transform: { ...t, ...partial } });
  };

  const blendModes: BlendMode[] = [
    'normal',
    'overlay',
    'multiply',
    'screen',
    'lighten',
    'darken',
  ];

  const fitModes: { id: ScaleFitMode; label: string; desc: string; icon: any }[] = [
    { id: 'contain', label: 'Ajustar (Fit)', desc: 'Ver video completo', icon: Minimize },
    { id: 'cover', label: 'Rellenar (Cover)', desc: 'Llenar toda la pantalla', icon: Maximize },
    { id: 'fill', label: 'Estirar (Fill)', desc: 'Estirar a los bordes', icon: Move },
  ];

  return (
    <div className="space-y-4 p-4 text-xs text-slate-300">
      {/* Fixed vs Free Resize Mode Selector */}
      <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 space-y-2 text-cyan-200">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-100">
            Modo de Redimensionado
          </span>
          <div className="flex items-center bg-black/40 border border-white/10 rounded-full p-0.5">
            <button
              type="button"
              onClick={() => {
                handleUpdate({ freeResize: false });
                showToast('🔒 Modo Fijo: tamaño proporcional sin estirarse');
              }}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                !isFreeResize
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Fijo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleUpdate({ freeResize: true });
                showToast('🖐️ Modo Libre: manipula ancho y alto libremente');
              }}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                isFreeResize
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Hand className="w-3 h-3" />
              <span>Libre</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFreeResize ? (
            <Hand className="w-4 h-4 text-cyan-400 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
          )}
          <span className="text-[11px] leading-tight">
            {isFreeResize ? (
              <>
                <b>Modo Libre activo:</b> Arrastra las esquinas, los bordes o usa 2 dedos para modificar ancho y alto libremente.
              </>
            ) : (
              <>
                <b>Modo Fijo (predeterminado):</b> Arrastra las esquinas o pellizca con 2 dedos para cambiar el tamaño sin estirar ni deformar la imagen.
              </>
            )}
          </span>
        </div>
      </div>

      {/* Quick Screen Fit & Orientation Controls */}
      <div>
        <label className="block text-slate-200 font-semibold mb-2">
          Ajuste de Tamaño en Pantalla
        </label>
        <div className="grid grid-cols-3 gap-2 mb-2.5">
          {fitModes.map((fm) => {
            const Icon = fm.icon;
            const active =
              (t.fitMode || 'contain') === fm.id &&
              scaleX === 1 &&
              scaleY === 1;
            return (
              <button
                key={fm.id}
                onClick={() => {
                  handleUpdate({
                    fitMode: fm.id,
                    scale: 1,
                    scaleX: 1,
                    scaleY: 1,
                    x: 0,
                    y: 0,
                  });
                  showToast(`📐 Modo de pantalla: ${fm.label}`);
                }}
                className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                  active
                    ? 'bg-indigo-600/30 border-indigo-400 text-white shadow'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-[11px]">{fm.label}</span>
                <span className="text-[9px] text-slate-400">{fm.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Actions: Rotate 90°, Flip H, Flip V, Reset Center */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => handleUpdate({ rotation: (t.rotation + 90) % 360 })}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1 text-slate-200"
          >
            <RotateCw className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-semibold">Girar 90°</span>
          </button>

          <button
            onClick={() => handleUpdate({ flipH: !t.flipH })}
            className={`p-2 rounded-lg border flex flex-col items-center gap-1 ${
              t.flipH
                ? 'bg-indigo-600/30 border-indigo-400 text-white'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
            }`}
          >
            <FlipHorizontal className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-semibold">Espejo H</span>
          </button>

          <button
            onClick={() => handleUpdate({ flipV: !t.flipV })}
            className={`p-2 rounded-lg border flex flex-col items-center gap-1 ${
              t.flipV
                ? 'bg-indigo-600/30 border-indigo-400 text-white'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
            }`}
          >
            <FlipVertical className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-semibold">Espejo V</span>
          </button>

          <button
            onClick={() =>
              handleUpdate({
                x: 0,
                y: 0,
                scale: 1,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                flipH: false,
                flipV: false,
              })
            }
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1 text-slate-200"
          >
            <Crosshair className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-semibold">Restablecer</span>
          </button>
        </div>
      </div>

      {/* Free Independent Width (scaleX) & Height (scaleY) */}
      <div
        className={`grid grid-cols-2 gap-3 pt-2 border-t border-white/10 transition-opacity ${
          isFreeResize ? '' : 'opacity-45'
        }`}
      >
        <div>
          <div className="flex justify-between text-slate-300 font-semibold mb-1">
            <span>Ancho Libre</span>
            <span className="text-cyan-400 font-mono">
              {Math.round(scaleX * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="4.0"
            step="0.02"
            value={scaleX}
            disabled={!isFreeResize}
            onChange={(e) => handleUpdate({ scaleX: Number(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-300 font-semibold mb-1">
            <span>Alto Libre</span>
            <span className="text-cyan-400 font-mono">
              {Math.round(scaleY * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="4.0"
            step="0.02"
            value={scaleY}
            disabled={!isFreeResize}
            onChange={(e) => handleUpdate({ scaleY: Number(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>
        {!isFreeResize && (
          <p className="col-span-2 text-[10px] text-slate-400 -mt-1">
            Activa el modo <b>Libre</b> arriba para estirar ancho y alto de forma independiente.
          </p>
        )}
      </div>

      {/* Scale & Rotation */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
        <div>
          <div className="flex justify-between text-slate-300 font-semibold mb-1">
            <span>Zoom / Escala</span>
            <span className="text-indigo-400 font-mono">
              {Math.round(t.scale * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="4.0"
            step="0.02"
            value={t.scale}
            onChange={(e) => handleUpdate({ scale: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-300 font-semibold mb-1">
            <span>Rotación Libre</span>
            <span className="text-indigo-400 font-mono">{t.rotation}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={t.rotation}
            onChange={(e) => handleUpdate({ rotation: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Position X and Y */}
      <div>
        <label className="block text-slate-300 font-semibold mb-1">
          Posición en Pantalla (X, Y)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Horizontal (X)</span>
              <span className="font-mono text-indigo-300">{t.x}%</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="0.5"
              value={t.x}
              onChange={(e) => handleUpdate({ x: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Vertical (Y)</span>
              <span className="font-mono text-indigo-300">{t.y}%</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="0.5"
              value={t.y}
              onChange={(e) => handleUpdate({ y: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Opacity & Blend Mode */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
        <div>
          <div className="flex justify-between text-slate-300 font-semibold mb-1">
            <span>Opacidad</span>
            <span className="text-indigo-400 font-mono">
              {Math.round(t.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.02"
            value={t.opacity}
            onChange={(e) => handleUpdate({ opacity: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Modo de Fusión
          </label>
          <select
            value={t.blendMode}
            onChange={(e) =>
              handleUpdate({ blendMode: e.target.value as BlendMode })
            }
            className="w-full bg-[#181926] border border-white/10 rounded-md p-1.5 text-slate-200 capitalize"
          >
            {blendModes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
