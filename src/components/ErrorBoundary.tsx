import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props  { children: React.ReactNode; }
interface State  { hasError: boolean; error: Error | null; }

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = { hasError: false, error: null } as State;
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App error:", error, info.componentStack);
  }

  render() {
    const s = (this as any).state as State;
    if (!s.hasError) return (this as any).props.children;
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-rose-400" />
          </div>
          <div>
            <h2 className="text-slate-100 font-black text-lg">Something went wrong</h2>
            <p className="text-slate-400 text-sm mt-1">An unexpected error occurred. Please refresh the page.</p>
            {s.error && (
              <p className="text-slate-600 text-xs mt-3 font-mono bg-slate-800 rounded-lg px-3 py-2 text-left break-all">
                {s.error.message}
              </p>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 mx-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm px-6 py-2.5 rounded-xl cursor-pointer transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Reload App
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
