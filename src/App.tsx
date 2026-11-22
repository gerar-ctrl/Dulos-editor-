// ============================================================================
// App.tsx - Mobile & Desktop Video Editor Interface with Resizable Screen
// ============================================================================

import React, { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { EditorTopBar } from './components/Editor/EditorTopBar';
import { PlaybackBar } from './components/Editor/PlaybackBar';
import { EditorBottomBar } from './components/Editor/EditorBottomBar';
import { DubbingBar, useDubbingRecorder } from './components/Editor/DubbingBar';
import { ExitConfirmModal } from './components/Common/ExitConfirmModal';
import { VideoCanvas } from './components/Canvas/VideoCanvas';
import { Timeline } from './components/Timeline/Timeline';
import { useEditorStore } from './store/useEditorStore';
import { ProjectStorage } from './core/storage/projectStorage';
import { globalAudioEngine } from './core/audio/AudioEngine';
import { consumeSharedMediaFiles } from './core/media/shareTarget';
import { importMediaFiles } from './core/media/importMediaFiles';
import { exitAndroidApp, isAndroidNativeApp } from './core/native/androidBridge';

// Retry dynamic imports once by reloading if a stale cached HTML references an old chunk hash
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem('chunk_reload_retried');
      return mod;
    } catch (err) {
      const alreadyRetried = sessionStorage.getItem('chunk_reload_retried');
      if (!alreadyRetried) {
        sessionStorage.setItem('chunk_reload_retried', '1');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}

// Lazy-load modals & contextual drawers so initial mobile startup is instant
const ToolDrawer = lazyWithRetry(() =>
  import('./components/Editor/ToolDrawer').then((m) => ({ default: m.ToolDrawer }))
);
const ExportModal = lazyWithRetry(() =>
  import('./components/Header/ExportModal').then((m) => ({ default: m.ExportModal }))
);
const ProjectModal = lazyWithRetry(() =>
  import('./components/Header/ProjectModal').then((m) => ({ default: m.ProjectModal }))
);
const MediaDrawer = lazyWithRetry(() =>
  import('./components/MediaLibrary/MediaDrawer').then((m) => ({ default: m.MediaDrawer }))
);

export const App: React.FC = () => {
  const {
    togglePlayPause,
    setCurrentTime,
    projectDuration,
    projectId,
    splitClip,
    trimLeftClip,
    trimRightClip,
    deleteClip,
    selectedClipId,
    toggleTrackVolumeLine,
    undo,
    redo,
    isExportModalOpen,
    isProjectModalOpen,
    isMediaDrawerOpen,
    canvasHeightVh,
    setCanvasHeightVh,
    inlineEditingTextClipId,
    isScreenCropMode,
    setScreenCropMode,
    toastMessage,
    hasUnsavedChanges,
  } = useEditorStore(
    useShallow((s) => ({
      togglePlayPause: s.togglePlayPause,
      setCurrentTime: s.setCurrentTime,
      projectDuration: s.project.settings.duration,
      projectId: s.project.id,
      splitClip: s.splitClip,
      trimLeftClip: s.trimLeftClip,
      trimRightClip: s.trimRightClip,
      deleteClip: s.deleteClip,
      selectedClipId: s.selectedClipId,
      toggleTrackVolumeLine: s.toggleTrackVolumeLine,
      undo: s.undo,
      redo: s.redo,
      isExportModalOpen: s.isExportModalOpen,
      isProjectModalOpen: s.isProjectModalOpen,
      isMediaDrawerOpen: s.isMediaDrawerOpen,
      canvasHeightVh: s.canvasHeightVh,
      setCanvasHeightVh: s.setCanvasHeightVh,
      inlineEditingTextClipId: s.inlineEditingTextClipId,
      isScreenCropMode: s.isScreenCropMode,
      setScreenCropMode: s.setScreenCropMode,
      toastMessage: s.toastMessage,
      hasUnsavedChanges: s.hasUnsavedChanges,
    }))
  );

  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [hasExited, setHasExited] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isConfirmingExit, setIsConfirmingExit] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashFading, setIsSplashFading] = useState(false);
  const [lockedCanvasHeightPx, setLockedCanvasHeightPx] = useState<number | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const stableCanvasHeightRef = useRef<number | null>(null);
  const isResizingCanvasRef = useRef(false);
  const isExitingRef = useRef(false);
  const showExitConfirmRef = useRef(false);
  showExitConfirmRef.current = showExitConfirm;

  const isTextEditingActive = Boolean(
    inlineEditingTextClipId || activeTool === 'text' || activeTool === 'textEdit'
  );

  // Track the normal pre-keyboard canvas height so entering text editing or opening the
  // mobile virtual keyboard NEVER shrinks the video preview screen.
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el || isTextEditingActive) return;
    const record = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h >= 160) {
        stableCanvasHeightRef.current = h;
      }
    };
    record();
    const obs = new ResizeObserver(record);
    obs.observe(el);
    return () => obs.disconnect();
  }, [isTextEditingActive, canvasHeightVh]);

  useEffect(() => {
    if (isTextEditingActive) {
      const currentH = Math.round(
        canvasContainerRef.current?.getBoundingClientRect().height || 0
      );
      const targetH = Math.max(stableCanvasHeightRef.current || 0, currentH);
      if (targetH >= 160) {
        setLockedCanvasHeightPx((prev) => prev ?? targetH);
      }
    } else {
      setLockedCanvasHeightPx(null);
    }
  }, [isTextEditingActive]);

  // Show startup splash screen for ~2 seconds before revealing the editor
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsSplashFading(true);
    }, 1800);
    const hideTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2100);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);
  const {
    isRecordingDub,
    elapsed: dubElapsed,
    micLevel: dubMicLevel,
    toggleDubbing,
    stopDubbing,
    cancelDubbing,
  } = useDubbingRecorder();

  // Close open tool drawer when switching or creating a project
  useEffect(() => {
    setActiveTool(null);
    setScreenCropMode(false);
  }, [projectId, setScreenCropMode]);

  // Close tool drawer when entering interactive screen crop mode
  useEffect(() => {
    if (isScreenCropMode) {
      setActiveTool(null);
    }
  }, [isScreenCropMode]);

  // Restore previous session from IndexedDB after first paint so mobile UI opens immediately
  useEffect(() => {
    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      setTimeout(async () => {
        const last = await ProjectStorage.loadLastProject();
        if (!cancelled && last) {
          const hasClips = last.tracks.some((t) => t.clips.length > 0);
          if (hasClips) {
            useEditorStore.setState({ project: last });
          }
        }

        // Import any media shared to the PWA via Android/OS Share Sheet
        if (!cancelled) {
          const params = new URLSearchParams(window.location.search);
          if (params.has('shared')) {
            params.delete('shared');
            const remaining = params.toString();
            const cleanUrl = window.location.pathname + (remaining ? `?${remaining}` : '') + window.location.hash;
            window.history.replaceState(null, '', cleanUrl);
          }

          const sharedFiles = await consumeSharedMediaFiles();
          if (!cancelled && sharedFiles.length > 0) {
            await importMediaFiles(sharedFiles);
          }
        }
      }, 0);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Global Audio Unlock on first touch/click anywhere on document
  useEffect(() => {
    const unlockAudio = () => {
      globalAudioEngine.init();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Escape' && useEditorStore.getState().isScreenCropMode) {
        e.preventDefault();
        setScreenCropMode(false);
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        globalAudioEngine.init();
        togglePlayPause();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          deleteClip(selectedClipId);
        }
      } else if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        splitClip(selectedClipId || undefined);
      } else if (e.code === 'KeyQ' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        trimLeftClip(selectedClipId || undefined);
      } else if (e.code === 'KeyW' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        trimRightClip(selectedClipId || undefined);
      } else if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleTrackVolumeLine();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const cur = useEditorStore.getState().currentTime;
        setCurrentTime(Math.max(0, cur - 1 / 30));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const cur = useEditorStore.getState().currentTime;
        setCurrentTime(
          Math.min(projectDuration, cur + 1 / 30)
        );
      } else if (e.code === 'Home' || e.key === 'Home') {
        e.preventDefault();
        setCurrentTime(0);
      } else if (e.code === 'End' || e.key === 'End') {
        e.preventDefault();
        setCurrentTime(projectDuration);
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.code === 'KeyY' || (e.shiftKey && e.code === 'KeyZ'))
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlayPause,
    setCurrentTime,
    projectDuration,
    selectedClipId,
    splitClip,
    trimLeftClip,
    trimRightClip,
    deleteClip,
    toggleTrackVolumeLine,
    undo,
    redo,
  ]);

  // Drag handle to resize video screen height vs timeline height
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isResizingCanvasRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingCanvasRef.current) return;
    const vh = ((e.clientY - 48) / Math.max(400, window.innerHeight)) * 100;
    setCanvasHeightVh(vh);
  };

  const handleResizePointerUp = () => {
    isResizingCanvasRef.current = false;
  };

  const performExitApp = useCallback(async () => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsConfirmingExit(true);

    const state = useEditorStore.getState();
    if (state.isPlaying) {
      togglePlayPause();
    }
    for (const el of state.mediaElements.values()) {
      if (el instanceof HTMLMediaElement) {
        try {
          el.pause();
        } catch {
          // ignore
        }
      }
    }

    const currentProject = state.project;
    const clipIds: string[] = [];
    for (const track of currentProject.tracks) {
      for (const clip of track.clips) {
        clipIds.push(clip.id);
        const maybeUrl = (clip as { sourceUrl?: string }).sourceUrl;
        if (typeof maybeUrl === 'string' && maybeUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(maybeUrl);
          } catch {
            // ignore
          }
        }
      }
    }

    try {
      await ProjectStorage.deleteProject(currentProject.id, clipIds);
    } catch (err) {
      console.error('Error deleting active project on exit:', err);
    }

    const electronApi = (
      window as unknown as {
        electronAPI?: {
          confirmQuitApp?: () => Promise<boolean>;
          quitApp?: () => Promise<boolean>;
        };
      }
    ).electronAPI;

    if (electronApi?.confirmQuitApp) {
      try {
        await electronApi.confirmQuitApp();
        return;
      } catch {
        // fallback below
      }
    } else if (electronApi?.quitApp) {
      try {
        await electronApi.quitApp();
        return;
      } catch {
        // fallback below
      }
    }

    if (exitAndroidApp()) {
      return;
    }

    setShowExitConfirm(false);
    setIsConfirmingExit(false);
    window.close();
    if (window.history.length > 1) {
      window.history.back();
    }
    isExitingRef.current = false;
    setHasExited(true);
  }, [togglePlayPause]);

  const requestExitApp = useCallback(() => {
    if (isExitingRef.current) return;
    const unsaved = useEditorStore.getState().hasUnsavedChanges;
    if (!unsaved) {
      void performExitApp();
      return;
    }
    setShowExitConfirm(true);
  }, [performExitApp]);

  // Keep Electron main process informed about hasUnsavedChanges in real time
  useEffect(() => {
    const electronApi = (
      window as unknown as {
        electronAPI?: {
          setUnsavedChanges?: (hasUnsaved: boolean) => void;
        };
      }
    ).electronAPI;

    electronApi?.setUnsavedChanges?.(hasUnsavedChanges);
  }, [hasUnsavedChanges]);

  // Intercept Electron window close ('X', Alt+F4, Cmd+Q) and Android Back button
  useEffect(() => {
    const electronApi = (
      window as unknown as {
        electronAPI?: {
          isElectron?: boolean;
          onCloseRequested?: (cb: () => void) => () => void;
        };
      }
    ).electronAPI;

    const unsubscribeElectron = electronApi?.onCloseRequested?.(() => {
      requestExitApp();
    });

    const handleAndroidBackExit = () => {
      if (showExitConfirmRef.current) {
        if (!isExitingRef.current) {
          setShowExitConfirm(false);
        }
        return;
      }
      requestExitApp();
    };

    window.addEventListener('dulos-request-exit', handleAndroidBackExit);
    return () => {
      unsubscribeElectron?.();
      window.removeEventListener('dulos-request-exit', handleAndroidBackExit);
    };
  }, [requestExitApp]);

  // Browser-only beforeunload safeguard when there are unsaved changes
  useEffect(() => {
    const electronApi = (
      window as unknown as {
        electronAPI?: { isElectron?: boolean };
      }
    ).electronAPI;
    if (electronApi?.isElectron || isAndroidNativeApp() || !hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (hasExited) {
    return (
      <div className="flex flex-col items-center justify-center h-screen supports-[height:100dvh]:h-[100dvh] w-screen bg-[#090a0f] text-slate-100 px-6 text-center select-none">
        <div className="max-w-sm space-y-4">
          <h1 className="text-lg font-semibold text-white">
            Has salido de Dulos editor
          </h1>
          <p className="text-xs text-slate-400">
            Ya puedes cerrar esta pestaña o ventana de forma segura.
          </p>
          <button
            onClick={() => setHasExited(false)}
            className="mt-2 px-4 py-2 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
          >
            Volver al editor
          </button>
        </div>
      </div>
    );
  }

  const isLargePreviewTool =
    activeTool === 'transitions' || activeTool === 'effects';

  return (
    <div className="flex flex-col h-screen supports-[height:100dvh]:h-[100dvh] w-screen bg-[#090a0f] text-slate-100 overflow-hidden font-sans select-none antialiased">
      {/* Startup Splash Screen (~2s) */}
      {showSplash && (
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-[9999] bg-[#060919] flex items-center justify-center overflow-hidden transition-opacity duration-300 ${
            isSplashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <img
            src="/splash.jpg"
            alt="Dulos Editor"
            className="w-full h-full object-cover object-center"
          />
        </div>
      )}

      {/* Live Toast Feedback Banner */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/95 text-white border border-indigo-400/50 px-3.5 py-1 rounded-full text-[11px] font-bold shadow-[0_4px_20px_rgba(79,70,229,0.6)] pointer-events-none whitespace-nowrap max-w-[90vw] truncate">
          {toastMessage}
        </div>
      )}

      {/* 1. Top Navigation Bar */}
      <EditorTopBar
        onOpenFormat={() => setActiveTool('format')}
        onExit={requestExitApp}
      />

      {/* 2. Video Preview Canvas (Expands automatically for Transition/FX preview!) */}
      <div
        ref={canvasContainerRef}
        style={
          isLargePreviewTool
            ? undefined
            : lockedCanvasHeightPx !== null
              ? { height: `${lockedCanvasHeightPx}px`, maxHeight: `${lockedCanvasHeightPx}px` }
              : { height: `${canvasHeightVh}vh` }
        }
        className={
          isLargePreviewTool
            ? 'flex-1 min-h-[220px] flex flex-col relative overflow-hidden bg-[#07080c]'
            : 'min-h-[160px] max-h-[70vh] flex flex-col relative overflow-hidden bg-[#07080c] shrink-0'
        }
      >
        <VideoCanvas />
      </div>

      {/* Draggable Splitter Handle between Screen & Timeline */}
      <div
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        className={`${
          isLargePreviewTool ? 'hidden' : 'flex'
        } h-1.5 bg-[#0c0d14] hover:bg-indigo-600/40 cursor-row-resize items-center justify-center touch-none shrink-0 z-30 group`}
        title="Arrastra arriba o abajo para cambiar el tamaño de la pantalla"
      >
        <div className="w-9 h-[3px] rounded-full bg-white/20 group-hover:bg-indigo-400 transition-colors" />
      </div>

      {/* 3. Transport & Scrubber Bar */}
      <div className={isLargePreviewTool ? 'hidden' : 'shrink-0'}>
        <PlaybackBar />
      </div>

      {/* 4. Multi-Track Magnetic Timeline */}
      <div
        className={`${
          isLargePreviewTool ? 'hidden' : 'flex'
        } flex-1 min-h-[120px] flex-col overflow-hidden relative`}
      >
        <Timeline onOpenTool={(toolId) => setActiveTool(toolId)} />
      </div>

      {/* Live Dubbing Recording Bar */}
      <DubbingBar
        isRecording={isRecordingDub}
        elapsed={dubElapsed}
        micLevel={dubMicLevel}
        onStop={stopDubbing}
        onCancel={cancelDubbing}
      />

      {/* 5. Bottom Tool Dock */}
      <div className={isLargePreviewTool ? 'hidden' : 'shrink-0'}>
        <EditorBottomBar
          onOpenTool={(toolId) => setActiveTool(toolId)}
          activeTool={activeTool}
          onToggleDubbing={toggleDubbing}
        />
      </div>

      {/* 6. Contextual Tool Editor Drawer */}
      {activeTool && (
        <Suspense fallback={null}>
          <ToolDrawer
            toolId={activeTool}
            inline={isLargePreviewTool}
            onClose={() => setActiveTool(null)}
          />
        </Suspense>
      )}

      {/* Modals & Dialogs */}
      {isExportModalOpen && (
        <Suspense fallback={null}>
          <ExportModal />
        </Suspense>
      )}
      {isProjectModalOpen && (
        <Suspense fallback={null}>
          <ProjectModal />
        </Suspense>
      )}
      {isMediaDrawerOpen && (
        <Suspense fallback={null}>
          <MediaDrawer />
        </Suspense>
      )}

      {/* Exit Confirmation Dialog (Unsaved Changes) */}
      <ExitConfirmModal
        isOpen={showExitConfirm}
        isExiting={isConfirmingExit}
        onCancel={() => {
          if (!isConfirmingExit) setShowExitConfirm(false);
        }}
        onConfirmExit={() => {
          void performExitApp();
        }}
      />
    </div>
  );
};
