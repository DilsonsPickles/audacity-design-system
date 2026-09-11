import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { SkinProvider, useSkin } from '../SkinProvider';
import { SkinScope } from '../SkinScope';
import { SkinSelector } from '../SkinSelector';
import { createSkinPreview } from '../skin-preview';
import { normalizeSkin } from '../skin-preferences';
import { resolveSkinTheme } from '../skin-themes';
import { lightTheme } from '@audacity-ui/tokens';

afterEach(() => { cleanup(); history.replaceState(null, '', '/'); });
it('keeps Default and high contrast on the original token objects', () => {
  expect(resolveSkinTheme('default', 'light')).toBe(lightTheme);
  expect(resolveSkinTheme('sakura', 'light', true)).toBe(lightTheme);
  expect(normalizeSkin('unknown')).toBe('default');
});
it('previews without persistence and waits for adoption before removing only useskin', async () => {
  history.replaceState({ saved: 7 }, '', '/?useskin=sakura&keep=1#anchor');
  const preview = createSkinPreview(window);
  expect(preview.getSnapshot()).toBe('sakura');
  await expect(preview.adopt('sakura', () => Promise.reject(new Error('disk')))).rejects.toThrow('disk');
  expect(preview.getSnapshot()).toBe('sakura');
  await preview.adopt('sakura', () => {});
  expect(location.search).toBe('?keep=1');
  expect(location.hash).toBe('#anchor');
  expect(history.state).toEqual({ saved: 7 });
});
it('cleans up history listeners idempotently', () => {
  const remove = vi.spyOn(window, 'removeEventListener');
  const unsubscribe = createSkinPreview(window).subscribe(() => {});
  unsubscribe(); unsubscribe();
  expect(remove).toHaveBeenCalledWith('popstate', expect.any(Function));
  remove.mockRestore();
});
it('carries the active skin into portal scopes without touching document.body', () => {
  history.replaceState(null, '', '/?useskin=techno');
  function Probe() { return <SkinScope><span>{useSkin().skin}</span></SkinScope>; }
  const { container } = render(<SkinProvider skin="sakura" mode="dark"><Probe /></SkinProvider>);
  expect(screen.getByText('techno')).toBeInTheDocument();
  expect(container.querySelector('[data-editor-skin="techno"]')).toBeTruthy();
  expect(document.body.hasAttribute('data-editor-skin')).toBe(false);
});
it('browses without adopting, and saves a clicked skin', async () => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollBy = vi.fn();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const persist = vi.fn();
  render(<SkinProvider mode="light"><SkinSelector value="default" onChange={persist} /></SkinProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Next skins' }));
  expect(persist).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /^Sakura$/ }));
  expect(persist).toHaveBeenCalledWith('sakura');
  vi.unstubAllGlobals();
});
