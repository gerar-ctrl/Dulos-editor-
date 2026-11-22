import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AppErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message || error.name
        : String(error || 'Error desconocido');
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary] Uncaught UI error:', error, info.componentStack);
  }

  handleContinue = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#090a0f] text-slate-100 px-6 text-center select-none">
        <div className="max-w-md w-full rounded-2xl bg-[#11131d] border border-white/10 p-6 shadow-2xl space-y-4">
          <h1 className="text-base font-bold text-white">
            Se detectó un problema visual en el editor
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Para evitar una pantalla negra, el editor detuvo el renderizado del panel afectado.
            Puedes intentar continuar o recargar la ventana (tu proyecto se restaura automáticamente).
          </p>
          {this.state.errorMessage && (
            <div className="text-[11px] font-mono text-rose-300/90 bg-black/40 border border-rose-500/20 rounded-lg px-3 py-2 break-words text-left max-h-24 overflow-auto">
              {this.state.errorMessage}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={this.handleContinue}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 transition-colors"
            >
              Intentar continuar
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Recargar editor
            </button>
          </div>
        </div>
      </div>
    );
  }
}
