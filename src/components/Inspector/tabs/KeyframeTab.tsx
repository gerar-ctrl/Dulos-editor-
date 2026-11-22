// ============================================================================
// KeyframeTab - Keyframe Animation Manager for Video, Image & Text Clips
// ============================================================================

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { TextClip, VideoClip } from '../../../types/editor';
import { useEditorStore } from '../../../store/useEditorStore';
import {
  extractKeyframeProperties,
  interpolateClipTransform,
} from '../../../core/keyframes/interpolateKeyframes';
import { Diamond, Trash2, Plus } from 'lucide-react';

interface KeyframeTabProps {
  clip: VideoClip | TextClip;
}

export const KeyframeTab: React.FC<KeyframeTabProps> = ({ clip }) => {
  const { addKeyframe, removeKeyframe, currentTime, setCurrentTime } =
    useEditorStore(
      useShallow((s) => ({
        addKeyframe: s.addKeyframe,
        removeKeyframe: s.removeKeyframe,
        currentTime: s.currentTime,
        setCurrentTime: s.setCurrentTime,
      }))
    );

  const localTime = Math.max(0, Math.min(clip.duration, currentTime - clip.startTime));
  const keyframes = clip.keyframes || [];

  const handleAddKeyframe = () => {
    const effective = interpolateClipTransform(clip, localTime);
    addKeyframe(clip.id, {
      id: 'kf_' + Math.random().toString(36).substring(2, 9),
      time: Number(localTime.toFixed(2)),
      properties: extractKeyframeProperties(effective),
      easing: 'easeInOut',
    });
  };

  return (
    <div className="space-y-4 p-4 text-xs text-slate-300">
      {/* Add Keyframe Button */}
      <button
        type="button"
        onClick={handleAddKeyframe}
        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-md font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all active:scale-95"
      >
        <Plus className="w-4 h-4" />
        <span>Añadir Fotograma Clave en {localTime.toFixed(2)}s</span>
      </button>

      {/* Existing Keyframes List */}
      <div>
        <label className="text-slate-400 font-semibold mb-2 block">
          Puntos Clave Registrados ({keyframes.length})
        </label>
        {keyframes.length === 0 ? (
          <p className="text-slate-500 italic">
            No hay keyframes. Añade uno y luego mueve, escala o rota el elemento en otro tiempo para animarlo.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {keyframes.map((kf) => (
              <div
                key={kf.id}
                onClick={() => setCurrentTime(clip.startTime + kf.time)}
                className="flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Diamond className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                  <span className="font-mono text-slate-200">
                    {kf.time.toFixed(2)}s
                  </span>
                  <span className="text-[10px] text-slate-400">
                    X: {Math.round(kf.properties.x ?? 0)}% | Y:{' '}
                    {Math.round(kf.properties.y ?? 0)}% | Esc:{' '}
                    {(kf.properties.scale ?? 1).toFixed(2)}x | Rot:{' '}
                    {Math.round(kf.properties.rotation ?? 0)}°
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeKeyframe(clip.id, kf.id);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
