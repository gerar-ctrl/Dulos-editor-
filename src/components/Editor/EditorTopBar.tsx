// ============================================================================
// EditorTopBar.tsx - Top Navigation Bar (Ratio Pill, Name & Export)
// ============================================================================

import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '../../store/useEditorStore';
import {
  Download,
  ChevronDown,
  Edit2,
  FilePlus2,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { AspectRatio } from '../../types/editor';

interface EditorTopBarProps {
  onOpenFormat: () => void;
  onExit?: () => void;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({
  onOpenFormat,
  onExit,
}) => {
  const {
    project,
    setProjectName,
    setIsExportModalOpen,
    setIsProjectModalOpen,
    newProject,
  } = useEditorStore(
    useShallow((s) => ({
      project: s.project,
      setProjectName: s.setProjectName,
      setIsExportModalOpen: s.setIsExportModalOpen,
      setIsProjectModalOpen: s.setIsProjectModalOpen,
      newProject: s.newProject,
    }))
  );

  const hasClips = project.tracks.some((t) => t.clips.length > 0);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.settings.name);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      setProjectName(titleInput.trim());
    }
  };

  const renderProjectTitle = () =>
    isEditingTitle ? (
      <div className="flex items-center gap-1 min-w-0">
        <input
          type="text"
          autoFocus
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          onBlur={handleTitleSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
          className="bg-[#181926] border border-indigo-500 rounded px-2 py-0.5 text-xs font-semibold text-white focus:outline-none w-32 sm:w-44"
        />
        <button
          onClick={handleTitleSubmit}
          className="p-1 text-emerald-400 hover:text-emerald-300 shrink-0"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>
    ) : (
      <div
        onClick={() => {
          setTitleInput(project.settings.name);
          setIsEditingTitle(true);
        }}
        className="flex items-center gap-1 cursor-pointer py-0.5 sm:py-1 px-1 sm:px-1.5 rounded hover:bg-white/5 transition-colors group min-w-0"
        title="Toca para cambiar nombre"
      >
        <span className="text-xs sm:text-sm font-bold text-white max-w-[140px] sm:max-w-[180px] truncate">
          {project.settings.name}
        </span>
        <Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500 group-hover:text-slate-300 shrink-0" />
      </div>
    );

  return (
    <header className="bg-[#090a10] border-b border-white/10 select-none shrink-0 z-30">
      <div className="h-10 sm:h-12 px-2 sm:px-4 flex items-center justify-between gap-1">
        {/* Left: Exit / Home / Project Title (title shown inline on sm+) */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {onExit && (
            <button
              onClick={onExit}
              className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/5 active:scale-95 transition-colors"
              title="Cerrar aplicación y borrar proyecto actual"
              aria-label="Cerrar aplicación y borrar proyecto actual"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          <button
            onClick={() => {
              if (hasClips) {
                setIsProjectModalOpen(true);
              } else {
                void newProject();
              }
            }}
            className="flex items-center gap-1 p-1 sm:px-2 sm:py-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Nuevo proyecto"
          >
            <FilePlus2 className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline text-xs font-medium">Nuevo</span>
          </button>

          {/* Desktop/Tablet Project Name & Attribution */}
          <div className="hidden sm:flex items-center gap-2 min-w-0">
            {renderProjectTitle()}
            <span className="text-[11px] text-slate-400 font-normal whitespace-nowrap">
              Diseñado por Gerardo Velázquez 2026
            </span>
          </div>
        </div>

        {/* Center: Aspect Ratio / Resolution Pill */}
        <div className="flex items-center shrink-0">
          <button
            onClick={onOpenFormat}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-mono font-semibold shadow-sm active:scale-95 transition-all"
            title="Cambiar relación de aspecto (Formato)"
          >
            <span className="text-indigo-400 font-bold">
              {project.settings.aspectRatio === 'auto'
                ? project.settings.customWidth && project.settings.customHeight
                  ? `📐 ${project.settings.customWidth}×${project.settings.customHeight}`
                  : '📐 Original'
                : project.settings.aspectRatio === 'free'
                ? project.settings.customWidth && project.settings.customHeight
                  ? `✂️ ${project.settings.customWidth}×${project.settings.customHeight}`
                  : '🖐️ Libre'
                : project.settings.aspectRatio}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">
              · {project.settings.fps}fps
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        {/* Right: Export Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Export Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white shadow-[0_2px_12px_rgba(168,85,247,0.4)] active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-bar: Project Title ("Dulos editor") + Attribution */}
      <div className="sm:hidden border-t border-white/5 bg-[#07080d] px-2.5 py-0.5 flex items-center justify-between gap-2">
        {renderProjectTitle()}
        <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap shrink-0">
          Diseñado por Gerardo Velázquez 2026
        </span>
      </div>
    </header>
  );
};
