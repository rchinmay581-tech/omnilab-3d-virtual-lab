import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage) as { error?: string; path?: string };
        if (parsed?.error) {
          friendly = parsed.path
            ? `${parsed.error} (Path: ${parsed.path})`
            : parsed.error;
        }
      } catch {
        // Keep plain message
      }

      return (
        <div className="min-h-screen w-screen bg-[#0b101b] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-xl bg-slate-900 border border-rose-700/70 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h1 className="text-base font-bold">OmniLab 3D Sync Interrupted</h1>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed break-words">
              {friendly}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reload Laboratory</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
