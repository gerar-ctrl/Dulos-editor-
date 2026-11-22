// ============================================================================
// ChromaKeyTab - Green Screen, Color Eyedropper, Feather & Spill Suppression
// ============================================================================

import React from 'react';
import { VideoClip } from '../../../types/editor';
import { useEditorStore } from '../../../store/useEditorStore';
import { ColorPalettePicker } from '../../Common/ColorPalettePicker';
import { Sparkles } from 'lucide-react';

interface ChromaKeyTabProps {
  clip: VideoClip;
}

export const ChromaKeyTab: React.FC<ChromaKeyTabProps> = ({ clip }) => {
  const updateClip = useEditorStore((s) => s.updateClip);
  const chroma = clip.chromaKey || {
    enabled: false,
    color: '#00ff00',
    tolerance: 0.35,
    feather: 0.1,
    spillSuppression: 0.5,
  };

  const handleUpdate = (partial: Partial<typeof chroma>) => {
    updateClip(clip.id, { chromaKey: { ...chroma, ...partial } });
  };

  return (
    <div className="space-y-4 p-4 text-xs text-slate-300">
      {/* Enable Toggle */}
      <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 cursor-pointer touch-manipulation select-none">
        <div className="flex items-center gap-2 pr-3">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className="font-semibold text-slate-200 block">
              Activar Croma (Chroma Key)
            </span>
            <span className="text-[11px] text-slate-400">
              Elimina fondos verdes, azules o cualquier color seleccionado
            </span>
          </div>
        </div>
        <div className="relative inline-flex items-center shrink-0">
          <input
            type="checkbox"
            checked={chroma.enabled}
            onChange={(e) => handleUpdate({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:bg-emerald-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
        </div>
      </label>

      {chroma.enabled && (
        <div className="space-y-4 pt-1">
          {/* Key Color Picker */}
          <div className="space-y-2">
            <label className="text-slate-400 font-semibold flex items-center justify-between">
              <span>Color de Fondo a Recortar</span>
              <span className="font-mono text-emerald-400 uppercase">{chroma.color}</span>
            </label>
            <ColorPalettePicker
              value={chroma.color}
              onChange={(hex) => handleUpdate({ color: hex })}
              eyedropperLabel="color croma a recortar"
              quickSwatches={['#00ff00', '#0000ff', '#00ffff', '#ffffff', '#000000', '#ff00ff', '#ef4444']}
            />
          </div>

          {/* Tolerance / Similarity */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Tolerancia (Intensidad)</span>
              <span className="font-mono">
                {Math.round(chroma.tolerance * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.8"
              step="0.01"
              value={chroma.tolerance}
              onChange={(e) =>
                handleUpdate({ tolerance: Number(e.target.value) })
              }
              className="w-full h-6 accent-emerald-500 cursor-pointer touch-pan-x"
            />
          </div>

          {/* Feather / Edge Softness */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Suavizado de Bordes (Feather)</span>
              <span className="font-mono">
                {Math.round(chroma.feather * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.5"
              step="0.01"
              value={chroma.feather}
              onChange={(e) => handleUpdate({ feather: Number(e.target.value) })}
              className="w-full h-6 accent-emerald-500 cursor-pointer touch-pan-x"
            />
          </div>

          {/* Spill Suppression */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Supresión de Derrame (Despill)</span>
              <span className="font-mono">
                {Math.round(chroma.spillSuppression * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.02"
              value={chroma.spillSuppression}
              onChange={(e) =>
                handleUpdate({ spillSuppression: Number(e.target.value) })
              }
              className="w-full h-6 accent-emerald-500 cursor-pointer touch-pan-x"
            />
          </div>
        </div>
      )}
    </div>
  );
};
