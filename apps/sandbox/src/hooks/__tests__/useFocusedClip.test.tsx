import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { useFocusedClip, clipOfElement } from '../useFocusedClip';

afterEach(cleanup);

function Probe({ onValue }: { onValue: (v: ReturnType<typeof useFocusedClip>) => void }) {
  const focused = useFocusedClip();
  onValue(focused);
  return (
    <div>
      <div data-clip-id="7" data-track-index="2" tabIndex={0} data-testid="clip">
        <button data-testid="inner">menu</button>
      </div>
      <input data-testid="field" />
    </div>
  );
}

describe('useFocusedClip — the clip with DOM focus (2026-10-06)', () => {
  it('reads the clip from the focused wrapper, keeps it while focus moves within the clip, clears when it leaves', () => {
    let value: ReturnType<typeof useFocusedClip> = null;
    const { getByTestId } = render(<Probe onValue={(v) => { value = v; }} />);
    expect(value).toBeNull();
    act(() => { getByTestId('clip').focus(); });
    expect(value).toEqual({ trackIndex: 2, clipId: 7 });
    act(() => { getByTestId('inner').focus(); });
    expect(value).toEqual({ trackIndex: 2, clipId: 7 });
    act(() => { getByTestId('field').focus(); });
    expect(value).toBeNull();
  });

  it('clipOfElement wants both ids and numbers', () => {
    const el = document.createElement('div');
    el.setAttribute('data-clip-id', 'x');
    el.setAttribute('data-track-index', '1');
    expect(clipOfElement(el)).toBeNull();
    expect(clipOfElement(null)).toBeNull();
  });
});
