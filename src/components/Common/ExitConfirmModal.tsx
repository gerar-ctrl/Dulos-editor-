// ============================================================================
// ExitConfirmModal.tsx - Unsaved Changes Exit Confirmation Dialog
// ============================================================================

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';

interface ExitConfirmModalProps {
  isOpen: boolean;
  isExiting?: boolean;
  onCancel: () => void;
  onConfirmExit: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  isExiting = false,
  onCancel,
  onConfirmExit,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus the primary safe action ("Cancelar") so Enter or Space won't accidentally exit
    const raf = requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExiting) {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, isExiting, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4 py-6 select-none animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-confirm-title"
      aria-describedby="exit-confirm-desc"
      onClick={() => {
        if (!isExiting) onCancel();
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#12131f] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.75)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/25 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="exit-confirm-title"
                className="text-base font-bold text-white leading-snug"
              >
                ¿Salir del editor?
              </h2>
              <p
                id="exit-confirm-desc"
                className="mt-1.5 text-xs sm:text-[13px] text-slate-300 leading-relaxed"
              >
                Tenés una edición en curso sin exportar. Si salís ahora, se perderán los cambios.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              disabled={isExiting}
              onClick={onConfirmExit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] border border-rose-500/30 text-rose-300 hover:text-rose-200 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isExiting ? 'Cerrando...' : 'Salir sin exportar'}</span>
            </button>

            <button
              ref={cancelButtonRef}
              type="button"
              disabled={isExiting}
              onClick={onCancel}
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-400 hover:to-purple-500 active:scale-[0.98] text-white shadow-[0_4px_18px_rgba(99,102,241,0.45)] focus:outline-none focus:ring-2 focus:ring-indigo-400/80 focus:ring-offset-2 focus:ring-offset-[#12131f] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
