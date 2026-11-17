import { describe, it, expect, afterEach } from 'vitest';
import { adoptParentStyles, syncParentStyles } from '../PopoutPanel';

// THE POPOUT'S STYLES FOLLOW THE APP'S (2026-11-17): a popout cloned the
// sheets once, and a hot reload rewrote only the main document's
const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
const added: Element[] = [];
afterEach(() => { added.forEach((n) => n.remove()); added.length = 0; });

describe('syncParentStyles', () => {
  it('re-clones the parent sheets when one is added or rewritten, keeping the popout chrome last', async () => {
    const sheet = document.createElement('style');
    sheet.textContent = '.a { color: red; }';
    document.head.appendChild(sheet);
    added.push(sheet);
    const popout = document.implementation.createHTMLDocument('popout');
    adoptParentStyles(popout);
    const stop = syncParentStyles(popout);
    const css = () => Array.from(popout.querySelectorAll('[data-popout-adopted]')).map((n) => n.textContent).join('\n');
    expect(css()).toContain('.a { color: red; }');

    // a hot reload rewrites a sheet's text
    sheet.textContent = '.a { color: blue; }';
    await frame();
    expect(css()).toContain('.a { color: blue; }');
    expect(css()).not.toContain('color: red');

    // …or adds one
    const extra = document.createElement('style');
    extra.textContent = '.pinned { top: 8px; }';
    document.head.appendChild(extra);
    added.push(extra);
    await frame();
    expect(css()).toContain('.pinned { top: 8px; }');

    // the popout's own chrome stays after the adopted sheets, so it wins
    const last = popout.head.lastElementChild;
    expect(last?.hasAttribute('data-popout-chrome')).toBe(true);

    // disconnected: later changes no longer reach it
    stop();
    sheet.textContent = '.a { color: green; }';
    await frame();
    expect(css()).not.toContain('green');
  });
});
