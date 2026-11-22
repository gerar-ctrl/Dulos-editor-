// ============================================================================
// MaskTab - Geometric Masks (Linear, Mirror, Circle, Rectangle, Star)
// ============================================================================

import React from 'react';
import { VideoClip, MaskType } from '../../../types/editor';
import { useEditorStore } from '../../../store/useEditorStore';
import {
  Circle,
  Square,
  Columns,
  Star,
  Sparkles,
  Maximize2,
  Diamond,
  Heart,
  Hexagon,
  Triangle,
  RectangleHorizontal,
} from 'lucide-react';
import { HorizontalScrollRow } from '../../Editor/HorizontalScrollRow';

interface MaskTabProps {
  clip: VideoClip;
}

export const MaskTab: React.FC<MaskTabProps> = ({ clip }) => {
  const updateClip = useEditorStore((s) => s.updateClip);
  const mask = clip.mask || {
    type: 'none',
    size: 50,
    feather: 10,
    rotation: 0,
    inverted: false,
  };

  const handleUpdate = (partial: Partial<typeof mask>) => {
    updateClip(clip.id, { mask: { ...mask, ...partial } });
  };

  const maskOptions: { id: MaskType; label: string; icon: any }[] = [
    { id: 'none', label: 'Sin máscara', icon: Maximize2 },
    { id: 'linear', label: 'Lineal (Split)', icon: Columns },
    { id: 'mirror', label: 'Espejo (Franja)', icon: Columns },
    { id: 'circle', label: 'Círculo', icon: Circle },
    { id: 'rectangle', label: 'Rectángulo', icon: Square },
    { id: 'roundedRect', label: 'Rect. Redondeado', icon: RectangleHorizontal },
    { id: 'star', label: 'Estrella', icon: Star },
    { id: 'heart', label: 'Corazón', icon: Heart },
    { id: 'diamond', label: 'Rombo', icon: Diamond },
    { id: 'hexagon', label: 'Hexágono', icon: Hexagon },
    { id: 'triangle', label: 'Triángulo', icon: Triangle },
  ];

  return (
    <div className="space-y-4 p-4 text-xs text-slate-300">
      {/* Mask Selector */}
      <div>
        <label className="text-slate-200 font-semibold mb-2 block">
          Forma de la Máscara
        </label>
        <HorizontalScrollRow>
          {maskOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => handleUpdate({ type: opt.id })}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg font-medium border transition-all whitespace-nowrap ${
                  mask.type === opt.id
                    ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </HorizontalScrollRow>
      </div>

      {mask.type !== 'none' && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          {/* Mask Size */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Tamaño de la Máscara</span>
              <span className="font-mono">{mask.size}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={mask.size}
              onChange={(e) => handleUpdate({ size: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Mask Feather */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Difuminado de Bordes (Feather)</span>
              <span className="font-mono">{mask.feather}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={mask.feather}
              onChange={(e) =>
                handleUpdate({ feather: Number(e.target.value) })
              }
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Mask Rotation */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Rotación de la Máscara</span>
              <span className="font-mono">{mask.rotation}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={mask.rotation}
              onChange={(e) =>
                handleUpdate({ rotation: Number(e.target.value) })
              }
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Invert Mask Checkbox */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="font-semibold text-slate-200">Invertir Máscara</span>
            <input
              type="checkbox"
              checked={mask.inverted}
              onChange={(e) => handleUpdate({ inverted: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
