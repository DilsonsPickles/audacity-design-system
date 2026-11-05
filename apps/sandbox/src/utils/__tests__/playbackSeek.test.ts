import { afterEach, describe, expect, it } from 'vitest';
import {
  LONG_SEEK_SECONDS, SHORT_SEEK_SECONDS,
  keepsItsArrowsWhilePlaying, playbackSeekKeyOf, playbackSeekTarget,
} from '../playbackSeek';

const key = (init: Partial<Pick<KeyboardEvent, 'key' | 'code' | 'shiftKey' | 'metaKey' | 'ctrlKey' | 'altKey'>>) => ({
  key: '', code: '', shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, ...init,
});

describe('playbackSeekKeyOf — Audacity 3\'s seek keys', () => {
  it('Left / Right are the short seek, with Shift the long one', () => {
    expect(playbackSeekKeyOf(key({ key: 'ArrowLeft', code: 'ArrowLeft' }))).toEqual({ direction: -1, long: false });
    expect(playbackSeekKeyOf(key({ key: 'ArrowRight', code: 'ArrowRight' }))).toEqual({ direction: 1, long: false });
    expect(playbackSeekKeyOf(key({ key: 'ArrowRight', code: 'ArrowRight', shiftKey: true }))).toEqual({ direction: 1, long: true });
  });

  it('comma / period are the same pair (Shift types < and >)', () => {
    expect(playbackSeekKeyOf(key({ key: ',', code: 'Comma' }))).toEqual({ direction: -1, long: false });
    expect(playbackSeekKeyOf(key({ key: '>', code: 'Period', shiftKey: true }))).toEqual({ direction: 1, long: true });
    expect(playbackSeekKeyOf(key({ key: '.' }))).toEqual({ direction: 1, long: false });
  });

  it('a Cmd / Ctrl / Option chord is never a seek, nor any other key', () => {
    expect(playbackSeekKeyOf(key({ key: 'ArrowLeft', metaKey: true }))).toBeNull();
    expect(playbackSeekKeyOf(key({ key: 'ArrowRight', ctrlKey: true }))).toBeNull();
    expect(playbackSeekKeyOf(key({ key: 'ArrowRight', altKey: true }))).toBeNull();
    expect(playbackSeekKeyOf(key({ key: ',', code: 'Comma', metaKey: true }))).toBeNull();
    expect(playbackSeekKeyOf(key({ key: 'ArrowUp' }))).toBeNull();
  });
});

describe('playbackSeekTarget', () => {
  it('moves by the period, either way', () => {
    expect(playbackSeekTarget(10, { direction: 1, long: false }, 60)).toBe(10 + SHORT_SEEK_SECONDS);
    expect(playbackSeekTarget(30, { direction: -1, long: true }, 60)).toBe(30 - LONG_SEEK_SECONDS);
  });

  it('stays inside the project', () => {
    expect(playbackSeekTarget(0.4, { direction: -1, long: false }, 60)).toBe(0);
    expect(playbackSeekTarget(50, { direction: 1, long: true }, 60)).toBe(60);
    // No clips: nothing to clamp to at the far end
    expect(playbackSeekTarget(5, { direction: 1, long: false }, 0)).toBe(6);
  });

  it('past the project\'s end a forward seek stays put — it never jumps back to the end', () => {
    expect(playbackSeekTarget(75, { direction: 1, long: false }, 60)).toBe(75);
    expect(playbackSeekTarget(75, { direction: 1, long: true }, 60)).toBe(75);
    // …and a backward seek from out there is still a plain step back
    expect(playbackSeekTarget(75, { direction: -1, long: false }, 60)).toBe(74);
  });
});

describe('keepsItsArrowsWhilePlaying', () => {
  const made: HTMLElement[] = [];
  const el = (html: string, selector?: string) => {
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    made.push(host);
    return (selector ? host.querySelector(selector) : host.firstElementChild) as HTMLElement;
  };
  afterEach(() => { made.splice(0).forEach((h) => h.remove()); });

  it('the project gives up its arrows: a clip, a track, the body, no focus', () => {
    expect(keepsItsArrowsWhilePlaying(null, 'mouse')).toBe(false);
    expect(keepsItsArrowsWhilePlaying(document.body, 'keyboard')).toBe(false);
    expect(keepsItsArrowsWhilePlaying(el('<div class="track"><div data-clip-id="a" tabindex="0"></div></div>', '[data-clip-id]'), 'keyboard')).toBe(false);
  });

  it('a control driven with the arrows keeps them', () => {
    expect(keepsItsArrowsWhilePlaying(el('<input type="text">'), 'mouse')).toBe(true);
    expect(keepsItsArrowsWhilePlaying(el('<input type="range">'), 'mouse')).toBe(true);
    expect(keepsItsArrowsWhilePlaying(el('<textarea></textarea>'), 'mouse')).toBe(true);
    expect(keepsItsArrowsWhilePlaying(el('<div role="slider" tabindex="0"></div>'), 'mouse')).toBe(true);
    expect(keepsItsArrowsWhilePlaying(el('<div role="menu"><div role="menuitem" tabindex="0"></div></div>', '[role="menuitem"]'), 'mouse')).toBe(true);
    expect(keepsItsArrowsWhilePlaying(el('<div class="timecode" tabindex="0"></div>'), 'mouse')).toBe(true);
    expect(keepsItsArrowsWhilePlaying(el('<button data-fade-handle="in"></button>'), 'mouse')).toBe(true);
    expect(keepsItsArrowsWhilePlaying(el('<button data-handle-kind="trim"></button>'), 'mouse')).toBe(true);
  });

  it('a checkbox has no use for the arrows', () => {
    expect(keepsItsArrowsWhilePlaying(el('<input type="checkbox">'), 'mouse')).toBe(false);
  });

  it('a toolbar button keeps them when reached by keyboard, not when clicked', () => {
    const play = el('<div class="transport-toolbar"><button aria-label="Pause"></button></div>', 'button');
    expect(keepsItsArrowsWhilePlaying(play, 'keyboard')).toBe(true);
    expect(keepsItsArrowsWhilePlaying(play, 'mouse')).toBe(false);
  });
});
