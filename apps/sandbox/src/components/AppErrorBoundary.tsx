import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render crashes anywhere in the app and shows the error instead
 * of a blank white screen. Without this, a thrown error (e.g. a stale
 * Vite dep-cache duplicate-context mismatch after the components `dist`
 * is rebuilt under a running dev server) unmounts the whole tree to
 * nothing, with no clue what happened. The reload button clears the
 * common transient causes.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep the full detail in the console for debugging.
    console.error('App crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 32,
          background: '#1e2130',
          color: '#eceef6',
          fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Something crashed</h1>
        <p style={{ fontSize: 14, color: '#8b93b8', maxWidth: 560, margin: 0, lineHeight: 1.5 }}>
          The app hit a render error. In development this is usually a stale
          module graph after a hot reload or a package rebuild — restart the
          dev server (and clear <code>node_modules/.vite</code>) if a reload
          doesn't fix it.
        </p>
        <pre
          style={{
            maxWidth: 720,
            maxHeight: 240,
            overflow: 'auto',
            margin: 0,
            padding: 16,
            borderRadius: 8,
            background: '#14151a',
            color: '#e14a78',
            fontSize: 12,
            fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
          }}
        >
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: 'none',
            background: '#677ce4',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}

export default AppErrorBoundary;
