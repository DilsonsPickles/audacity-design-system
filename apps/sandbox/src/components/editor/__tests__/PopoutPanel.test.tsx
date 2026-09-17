import React from 'react';
import { render, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PopoutPanel } from '../PopoutPanel';

afterEach(cleanup);

/** iframe-backed window.open stub — a fresh iframe per call, since
 *  popout.close() destroys a jsdom window. */
function stubWindowOpen() {
  const iframes: HTMLIFrameElement[] = [];
  const opened: Window[] = [];
  const spy = vi.spyOn(window, 'open').mockImplementation(() => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    iframes.push(iframe);
    const win = iframe.contentWindow!;
    opened.push(win);
    return win as Window & typeof globalThis;
  });
  return {
    opened,
    restore: () => {
      spy.mockRestore();
      iframes.forEach((el) => el.remove());
    },
  };
}

describe('PopoutPanel', () => {
  it('survives a StrictMode double-mount — the remount reclaims the window instead of racing open/close', async () => {
    const stub = stubWindowOpen();
    const onClose = vi.fn();
    try {
      // StrictMode mounts, cleans up, and remounts effects synchronously
      // in dev — the exact sequence that used to close the popout the
      // instant it opened ("Open in window makes the panel vanish").
      render(
        <React.StrictMode>
          <PopoutPanel title="Probe Strict" width={320} height={480} onClose={onClose}>
            <div data-testid="payload">hello popout</div>
          </PopoutPanel>
        </React.StrictMode>,
      );

      await waitFor(() => {
        const alive = stub.opened.find((win) => {
          try {
            return !!win.document.querySelector('[data-testid="payload"]');
          } catch {
            return false;
          }
        });
        expect(alive).toBeTruthy();
      });
      // The double-mount must not have reported a close (which would
      // re-dock the panel and tear the popout down)
      expect(onClose).not.toHaveBeenCalled();
      // Let the deferred-close timer from the StrictMode fake unmount
      // prove it was cancelled
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(onClose).not.toHaveBeenCalled();
      const alive = stub.opened.find((win) => {
        try {
          return !!win.document.querySelector('[data-testid="payload"]');
        } catch {
          return false;
        }
      });
      expect(alive).toBeTruthy();
    } finally {
      stub.restore();
    }
  });

  it('a real unmount closes the popout without reporting onClose', async () => {
    const stub = stubWindowOpen();
    const onClose = vi.fn();
    try {
      const { unmount } = render(
        <PopoutPanel title="Probe Unmount" width={320} height={480} onClose={onClose}>
          <div data-testid="payload">hello popout</div>
        </PopoutPanel>,
      );
      await waitFor(() =>
        expect(stub.opened[0].document.querySelector('[data-testid="payload"]')).toBeTruthy(),
      );
      unmount();
      await new Promise((resolve) => setTimeout(resolve, 20));
      // Unmounting is programmatic teardown, not a user close gesture
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      stub.restore();
    }
  });
});
