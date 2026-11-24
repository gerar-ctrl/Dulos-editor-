// ============================================================================
// TopNavBar - Project Title, Undo/Redo, FPS, Canvas Ratio & Export CTA
// ============================================================================

import React, { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import {
  hasExportableMedia,
  NO_MEDIA_EXPORT_MESSAGE,
} from '../../core/export/exportValidation';
import {
  Undo2,
  Redo2,
  Download,
  Film,
  FolderOpen,
  Plus,
  MonitorPlay,
} from 'lucide-react';

export const TopNavBar: React.FC = () => {
  const {
    project,
    setProjectName,
    setProjectFps,
    undo,
    redo,
    canUndo,
    canRedo,
    setIsExportModalOpen,
    newProject,
  } = useEditorStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.settings.name);
  const canExport = hasExportableMedia(project);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      setProjectName(titleInput.trim());
    }
  };

  return (
    <header className="h-12 bg-[#0c0d14] border-b border-white/10 px-3 sm:px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* Left: Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
            <Film className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold tracking-tight text-white hidden sm:inline text-sm bg-gradient-to-r from-indigo-200 to-white bg-clip-text text-transparent">
            Dulos editor
          </span>
          <span className="hidden md:inline text-[11px] text-slate-400 font-normal whitespace-nowrap">
            Diseñado por Gerardo Velázquez 2026
          </span>
        </div>

        {/* Project Name (Editable inline) */}
        <div className="flex items-center ml-2 border-l border-white/10 pl-3">
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="bg-[#181926] border border-indigo-500 rounded px-2 py-0.5 text-xs font-semibold text-white focus:outline-none"
            />
          ) : (
            <span
              onClick={() => {
                setTitleInput(project.settings.name);
                setIsEditingTitle(true);
              }}
              className="text-xs font-semibold text-slate-200 hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-white/5 transition-colors max-w-[120px] sm:max-w-[200px] truncate"
              title="Haz clic para renombrar el proyecto"
            >
              {project.settings.name}
            </span>
          )}
        </div>
      </div>

      {/* Center: Undo / Redo & FPS */}
      <div className="flex items-center gap-2">
        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Deshacer (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Rehacer (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* FPS Selector Pill */}
        <select
          value={project.settings.fps}
          onChange={(e) => setProjectFps(Number(e.target.value))}
          className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-md px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none cursor-pointer"
        >
          {[24, 25, 30, 50, 60].map((f) => (
            <option key={f} value={f} className="bg-[#12131b] text-white">
              {f} FPS
            </option>
          ))}
        </select>
      </div>

      {/* Right: New Project & Export CTA */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => void newProject()}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
          title="Crear un nuevo proyecto en blanco"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo</span>
        </button>

        <button
          onClick={() => setIsExportModalOpen(true)}
          aria-disabled={!canExport}
          title={canExport ? 'Exportar proyecto' : NO_MEDIA_EXPORT_MESSAGE}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
            canExport
              ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white shadow-lg active:scale-95'
              : 'bg-white/10 text-slate-400 border border-white/10 opacity-60 cursor-not-allowed'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
