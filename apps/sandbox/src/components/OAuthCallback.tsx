import React from 'react';
import { handleCallback } from '../lib/musehub-client';

type Status = 'pending' | 'error';

export function OAuthCallback() {
  const [status, setStatus] = React.useState<Status>('pending');
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await handleCallback();
        if (cancelled) return;
        window.location.replace('/');
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f1116',
        color: '#f4f5f9',
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
      }}
    >
      {status === 'pending' ? (
        <span>Signing you in…</span>
      ) : (
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Sign-in failed
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.8,
              marginBottom: 16,
              wordBreak: 'break-word',
            }}
          >
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={() => window.location.replace('/')}
            style={{
              background: '#677ce4',
              color: '#f4f5f9',
              border: 0,
              borderRadius: 2,
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Back to app
          </button>
        </div>
      )}
    </div>
  );
}

export default OAuthCallback;
