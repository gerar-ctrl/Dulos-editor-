// ============================================================================
// InspectorPanel - Contextual Property Inspector Panel (Mobile & Desktop)
// ============================================================================

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '../../store/useEditorStore';
import { TransformTab } from './tabs/TransformTab';
import { SpeedTab } from './tabs/SpeedTab';
import { ColorGradingTab } from './tabs/ColorGradingTab';
import { ChromaKeyTab } from './tabs/ChromaKeyTab';
import { ColorPalettePicker } from '../Common/ColorPalettePicker';
import { MaskTab } from './tabs/MaskTab';
import { AudioTab } from './tabs/AudioTab';
import { TextTab } from './tabs/TextTab';
import { KeyframeTab } from './tabs/KeyframeTab';
import { TransitionsTab } from './tabs/TransitionsTab';
import { AnimationsTab } from './tabs/AnimationsTab';
import { VideoClip, AudioClip, TextClip } from '../../types/editor';
import {
  Move,
  Gauge,
  Palette,
  Sparkles,
  Crop,
  Volume2,
  Type,
  Diamond,
  Layers,
  Settings,
  Zap,
} from 'lucide-react';

export const InspectorPanel: React.FC = () => {
  const {
    selectedClipId,
    activeInspectorTab,
    setActiveInspectorTab,
    project,
    setCanvasBackground,
  } = useEditorStore(
    useShallow((s) => ({
      selectedClipId: s.selectedClipId,
      activeInspectorTab: s.activeInspectorTab,
      setActiveInspectorTab: s.setActiveInspectorTab,
      project: s.project,
      setCanvasBackground: s.setCanvasBackground,
    }))
  );

  const selectedClip = selectedClipId
    ? project.tracks
        .flatMap((t) => t.clips)
        .find((c) => c.id === selectedClipId)
    : null;

  // Available tabs depending on clip type
  const getTabs = () => {
    if (!selectedClip) {
      return [{ id: 'project', label: 'Lienzo', icon: Settings }];
    }
    if (selectedClip.type === 'video') {
      return [
        { id: 'transform', label: 'Transformar', icon: Move },
        { id: 'animations', label: 'Animación', icon: Zap },
        { id: 'transitions', label: 'Transición / FX', icon: Layers },
        { id: 'color', label: 'Filtros / Color', icon: Palette },
        { id: 'speed', label: 'Velocidad', icon: Gauge },
        { id: 'chroma', label: 'Croma', icon: Sparkles },
        { id: 'mask', label: 'Máscaras', icon: Crop },
        { id: 'audio', label: 'Audio', icon: Volume2 },
        { id: 'keyframes', label: 'Puntos Clave', icon: Diamond },
      ];
    }
    if (selectedClip.type === 'image') {
      return [
        { id: 'transform', label: 'Transformar', icon: Move },
        { id: 'animations', label: 'Animación', icon: Zap },
        { id: 'transitions', label: 'Transición / FX', icon: Layers },
        { id: 'color', label: 'Filtros / Color', icon: Palette },
        { id: 'chroma', label: 'Croma', icon: Sparkles },
        { id: 'mask', label: 'Máscaras', icon: Crop },
        { id: 'keyframes', label: 'Puntos Clave', icon: Diamond },
      ];
    }
    if (selectedClip.type === 'audio') {
      return [{ id: 'audio', label: 'Audio', icon: Volume2 }];
    }
    if (selectedClip.type === 'text' || selectedClip.type === 'subtitle') {
      return [
        { id: 'text', label: 'Texto', icon: Type },
        { id: 'transform', label: 'Posición', icon: Move },
      ];
    }
    return [];
  };

  const tabs = getTabs();

  return (
    <div className="w-full lg:w-80 h-full flex flex-col bg-[#10111a] border-l border-white/5 select-none overflow-hidden shrink-0">
      {/* Tab Navigation Header */}
      <div className="flex items-center gap-1 p-1.5 bg-[#0c0d14] border-b border-white/5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeInspectorTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveInspectorTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto">
        {!selectedClip && (
          <div className="p-4 space-y-4 text-xs text-slate-300">
            <h3 className="text-slate-100 font-bold text-sm">
              Fondo del Lienzo
            </h3>
            <p className="text-slate-400">
              Selecciona un clip en la línea de tiempo para editar sus
              propiedades, o personaliza el fondo del proyecto:
            </p>

            <div className="space-y-2">
              <ColorPalettePicker
                value={project.settings.background.color || '#0d0e15'}
                onChange={(hex) =>
                  setCanvasBackground({
                    ...project.settings.background,
                    color: hex,
                  })
                }
                label="Color de Fondo:"
                eyedropperLabel="fondo del lienzo"
              />
            </div>
          </div>
        )}

        {selectedClip && activeInspectorTab === 'transform' && (
          <TransformTab clip={selectedClip as VideoClip | TextClip} />
        )}
        {selectedClip &&
          activeInspectorTab === 'speed' &&
          selectedClip.type === 'video' && (
            <SpeedTab clip={selectedClip as VideoClip} />
          )}
        {selectedClip &&
          activeInspectorTab === 'color' &&
          (selectedClip.type === 'video' || selectedClip.type === 'image') && (
            <ColorGradingTab clip={selectedClip as VideoClip} />
          )}
        {selectedClip &&
          activeInspectorTab === 'chroma' &&
          (selectedClip.type === 'video' || selectedClip.type === 'image') && (
            <ChromaKeyTab clip={selectedClip as VideoClip} />
          )}
        {selectedClip &&
          activeInspectorTab === 'mask' &&
          (selectedClip.type === 'video' || selectedClip.type === 'image') && (
            <MaskTab clip={selectedClip as VideoClip} />
          )}
        {selectedClip &&
          activeInspectorTab === 'audio' &&
          (selectedClip.type === 'video' || selectedClip.type === 'audio') && (
            <AudioTab clip={selectedClip as VideoClip | AudioClip} />
          )}
        {selectedClip &&
          activeInspectorTab === 'text' &&
          (selectedClip.type === 'text' || selectedClip.type === 'subtitle') && (
            <TextTab clip={selectedClip as TextClip} />
          )}
        {selectedClip &&
          activeInspectorTab === 'keyframes' &&
          (selectedClip.type === 'video' || selectedClip.type === 'image') && (
            <KeyframeTab clip={selectedClip as VideoClip} />
          )}
        {selectedClip &&
          activeInspectorTab === 'animations' &&
          selectedClip.type !== 'audio' && (
            <AnimationsTab clip={selectedClip as VideoClip | TextClip} />
          )}
        {selectedClip &&
          activeInspectorTab === 'transitions' &&
          (selectedClip.type === 'video' || selectedClip.type === 'image') && (
            <TransitionsTab clip={selectedClip as VideoClip} />
          )}
      </div>
    </div>
  );
};
