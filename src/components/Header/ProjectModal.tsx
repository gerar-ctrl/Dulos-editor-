// ============================================================================
// ProjectModal.tsx - New Project, Discard & Reset, and Open Saved Projects
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  X,
  FolderOpen,
  FilePlus2,
  Trash2,
  Clock,
  Film,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import {
  ProjectStorage,
  ProjectSummary,
} from '../../core/storage/projectStorage';

function formatDate(ts: number): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '';
  }
}

export const ProjectModal: React.FC = () => {
  const {
    project,
    isProjectModalOpen,
    setIsProjectModalOpen,
    newProject,
    loadProjectFromDisk,
    deleteProjectFromDisk,
  } = useEditorStore(
    useShallow((s) => ({
      project: s.project,
      isProjectModalOpen: s.isProjectModalOpen,
      setIsProjectModalOpen: s.setIsProjectModalOpen,
      newProject: s.newProject,
      loadProjectFromDisk: s.loadProjectFromDisk,
      deleteProjectFromDisk: s.deleteProjectFromDisk,
    }))
  );

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const currentHasClips = project.tracks.some((t) => t.clips.length > 0);

  const refreshList = useCallback(async () => {
    setIsLoading(true);
    try {
      await ProjectStorage.saveProject(useEditorStore.getState().project);
      const list = await ProjectStorage.listProjectSummaries();
      setProjects(list);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isProjectModalOpen) {
      setNewName('');
      setConfirmDeleteId(null);
      void refreshList();
    }
  }, [isProjectModalOpen, refreshList]);

  if (!isProjectModalOpen) return null;

  const handleCreateNew = async (discardCurrent: boolean) => {
    await newProject({
      name: newName.trim() || undefined,
      discardCurrent,
    });
  };

  const handleOpenProject = async (id: string) => {
    if (id === project.id) {
      setIsProjectModalOpen(false);
      return;
    }
    await loadProjectFromDisk(id);
  };

  const handleDeleteProject = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    await deleteProjectFromDisk(id);
    await refreshList();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4"
      onClick={() => setIsProjectModalOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-[#10121c] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-white/10 bg-[#141726]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                Proyectos
              </h2>
              <p className="text-[11px] text-slate-400">
                Crea un proyecto nuevo o abre uno guardado
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsProjectModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
          {/* New Project Section */}
          <div className="rounded-xl bg-[#161929] border border-indigo-500/25 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Nuevo proyecto</span>
            </div>

            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleCreateNew(false);
                }
              }}
              placeholder="Nombre del nuevo proyecto (opcional)..."
              className="w-full bg-[#0c0e17] border border-white/10 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
            />

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => void handleCreateNew(false)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white shadow-lg active:scale-[0.99] transition-all"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Empezar proyecto nuevo</span>
              </button>

              {currentHasClips && (
                <button
                  onClick={() => void handleCreateNew(true)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 active:scale-[0.99] transition-all"
                  title="Elimina el proyecto actual y reinicia desde cero"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Descartar actual y reiniciar</span>
                </button>
              )}
            </div>
          </div>

          {/* Saved Projects List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Abrir proyecto ({projects.length})
              </span>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Cargando proyectos guardados...
              </div>
            ) : projects.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 bg-[#0d0f18] rounded-xl border border-white/5">
                No hay proyectos guardados todavía.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {projects.map((item) => {
                  const isCurrent = item.id === project.id;
                  const isConfirmingDelete = confirmDeleteId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-2 p-3 rounded-xl border transition-colors ${
                        isCurrent
                          ? 'bg-indigo-500/10 border-indigo-500/40'
                          : 'bg-[#141724] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => void handleOpenProject(item.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white truncate">
                            {item.name}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/25 text-indigo-300 border border-indigo-400/30 shrink-0">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Actual
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Film className="w-3 h-3 text-slate-500" />
                            {item.clipCount}{' '}
                            {item.clipCount === 1 ? 'clip' : 'clips'}
                          </span>
                          <span>
                            {item.aspectRatio === 'auto'
                              ? 'Original'
                              : item.aspectRatio === 'free'
                              ? 'Libre'
                              : item.aspectRatio}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {formatDate(item.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isCurrent && (
                          <button
                            onClick={() => void handleOpenProject(item.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors"
                          >
                            Abrir
                          </button>
                        )}
                        <button
                          onClick={() => void handleDeleteProject(item.id)}
                          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isConfirmingDelete
                              ? 'bg-rose-600 text-white px-2.5'
                              : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                          }`}
                          title={
                            isConfirmingDelete
                              ? 'Haz clic otra vez para confirmar'
                              : 'Eliminar proyecto'
                          }
                        >
                          {isConfirmingDelete ? (
                            'Confirmar'
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
