import { describe, it, expect, afterEach } from 'vitest';
import { resolveStatusInfo } from '../statusInfo';

const mac = { os: 'macos' as const };
const win = { os: 'windows' as const };

let host: HTMLElement | null = null;
function dom(html: string): HTMLElement {
  host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}
afterEach(() => { host?.remove(); host = null; });

const at = (root: HTMLElement, selector: string) => root.querySelector(selector) as Element;

describe('resolveStatusInfo — the status bar\'s info line (2026-11-05, the Figma Status/Info bar spec)', () => {
  it('a toolbar button reads its name and the shortcut the prototype binds, in the OS\'s glyphs', () => {
    const root = dom(`
      <div class="transport-toolbar">
        <button aria-label="Play"><span id="icon"></span></button>
        <button aria-label="Stop"></button>
        <button aria-label="Skip to start"></button>
        <button aria-label="Loop" aria-pressed="false"></button>
        <button aria-label="Cut / Split"></button>
        <button aria-label="Zoom in"></button>
        <button aria-label="Trim"></button>
        <button aria-label="Collapse tracks"></button>
        <div role="checkbox" aria-label="Snap to grid" aria-checked="true"></div>
      </div>
      <div class="project-toolbar">
        <button class="tab">Project</button>
        <button aria-label="Undo"></button>
        <button aria-label="Redo"></button>
      </div>`);
    // From a child of the button: the nearest rule up from the target
    expect(resolveStatusInfo(at(root, '#icon'), mac)).toBe('Play (Space)');
    expect(resolveStatusInfo(at(root, '[aria-label="Stop"]'), mac)).toBe('Stop');
    expect(resolveStatusInfo(at(root, '[aria-label="Skip to start"]'), mac)).toBe('Skip to start (Home) / Select to start (⇧Home)');
    expect(resolveStatusInfo(at(root, '[aria-label="Loop"]'), mac)).toBe('Enable looping (L)');
    at(root, '[aria-label="Loop"]').setAttribute('aria-pressed', 'true');
    expect(resolveStatusInfo(at(root, '[aria-label="Loop"]'), mac)).toBe('Disable looping (L)');
    // Ours is C (the spec draws S); zoom carries the real build's chord
    expect(resolveStatusInfo(at(root, '[aria-label="Cut / Split"]'), mac)).toBe('Split tool (C)');
    expect(resolveStatusInfo(at(root, '[aria-label="Zoom in"]'), mac)).toBe('Zoom in (⌘=)');
    expect(resolveStatusInfo(at(root, '[aria-label="Zoom in"]'), win)).toBe('Zoom in (Ctrl+=)');
    // No shortcut is claimed where the prototype binds none (the spec's ⌘T)
    expect(resolveStatusInfo(at(root, '[aria-label="Trim"]'), mac)).toBe('Trim audio outside selection');
    // A button the table does not know still names itself
    expect(resolveStatusInfo(at(root, '[aria-label="Collapse tracks"]'), mac)).toBe('Collapse tracks');
    expect(resolveStatusInfo(at(root, '[role="checkbox"]'), mac)).toBe('Click to disable snapping');
    expect(resolveStatusInfo(at(root, '.tab'), mac)).toBe('Project');
    expect(resolveStatusInfo(at(root, '[aria-label="Undo"]'), mac)).toBe('Undo (⌘Z)');
    expect(resolveStatusInfo(at(root, '[aria-label="Redo"]'), mac)).toBe('Redo (⌘⇧Z)');
    expect(resolveStatusInfo(at(root, '[aria-label="Redo"]'), win)).toBe('Redo (Ctrl+Shift+Z)');
  });

  it('a slider reads its VALUE: volume and pan in percent, the levels, the speed', () => {
    const root = dom(`
      <div class="track-control-panel">
        <div data-tcp-slot="pan"><button class="knob" role="slider" aria-valuenow="0"><i id="dial"></i></button></div>
        <div data-tcp-slot="volume"><div class="slider"><input value="75" /><i id="handle"></i></div></div>
      </div>
      <div class="master-meter"><i id="bars"></i><div role="slider" aria-label="Master volume" aria-valuenow="20"></div></div>
      <div role="slider" aria-label="Microphone level" aria-valuenow="17"></div>
      <span data-varispeed><span data-varispeed-display>110%</span><i id="track"></i></span>`);
    expect(resolveStatusInfo(at(root, '#dial'), mac)).toBe('Pan: Centre');
    at(root, '.knob').setAttribute('aria-valuenow', '-10');
    expect(resolveStatusInfo(at(root, '#dial'), mac)).toBe('Pan: 10% left');
    at(root, '.knob').setAttribute('aria-valuenow', '35');
    expect(resolveStatusInfo(at(root, '#dial'), mac)).toBe('Pan: 35% right');
    expect(resolveStatusInfo(at(root, '#handle'), mac)).toBe('Volume: 75%');
    expect(resolveStatusInfo(at(root, '[aria-label="Master volume"]'), mac)).toBe('Playback level (20%)');
    expect(resolveStatusInfo(at(root, '#bars'), mac)).toBe('Playback meter');
    expect(resolveStatusInfo(at(root, '[aria-label="Microphone level"]'), mac)).toBe('Recording level (17%)');
    expect(resolveStatusInfo(at(root, '#track'), mac)).toBe('Playback speed: 110%');
  });

  it('the track header: its controls name themselves, its surface gives the select gesture, its edge the resize', () => {
    const root = dom(`
      <div class="resizable-panel__content" id="content">
        <div class="track-control-panel">
          <i id="surface"></i>
          <button aria-label="Track menu"></button>
          <button aria-label="Mute">M</button>
          <button aria-label="Solo">S</button>
          <button class="button"><span id="fx">Effects</span></button>
        </div>
      </div>`);
    expect(resolveStatusInfo(at(root, '#surface'), mac)).toBe('Command + Click to select or deselect track.');
    expect(resolveStatusInfo(at(root, '#surface'), win)).toBe('Ctrl + Click to select or deselect track.');
    expect(resolveStatusInfo(at(root, '[aria-label="Track menu"]'), mac)).toBe('Track menu');
    expect(resolveStatusInfo(at(root, '[aria-label="Mute"]'), mac)).toBe('Mute (⇧U)');
    expect(resolveStatusInfo(at(root, '[aria-label="Solo"]'), mac)).toBe('Solo (⇧S)');
    expect(resolveStatusInfo(at(root, '#fx'), mac)).toBe('Effects (E)');
    // At the resize edge the state wins over whatever is under the pointer
    at(root, '#content').classList.add('resizable-panel__content--resize-cursor');
    expect(resolveStatusInfo(at(root, '[aria-label="Mute"]'), mac)).toBe('Click and drag to resize the track.');
  });

  it('clips, the canvas, the rulers, envelopes and the effects panel', () => {
    const root = dom(`
      <div data-canvas-pointer id="canvas">
        <div class="clip-header"><span id="name">Clip 1</span><button class="clip-header__menu-button"><i id="dots"></i></button></div>
        <div id="lane"></div>
        <div id="env"><i id="envInner"></i></div>
      </div>
      <div aria-label="Timeline ruler" id="ruler"></div>
      <div class="vertical-ruler-panel__track"><i id="ticks"></i></div>
      <div aria-label="Effects panel">
        <button aria-label="Close effects panel"></button>
        <button aria-label="Disable all track effects"></button>
        <button aria-label="Enable all master effects"></button>
        <div class="effect-slot">
          <div class="effect-slot__drag-handle"></div>
          <button aria-label="Disable effect"></button>
          <button class="effect-slot__name-field"></button>
          <button class="effect-slot__settings-button"></button>
        </div>
        <button id="add">Add effect</button>
        <button id="other">Something else</button>
      </div>`);
    expect(resolveStatusInfo(at(root, '#name'), mac)).toBe('Drag clips to reposition them - hold Option and drag to duplicate.');
    expect(resolveStatusInfo(at(root, '#dots'), mac)).toBe('Click to open clip context menu.');
    // Bare canvas: nothing — the bar's own "Click and drag to select audio"
    expect(resolveStatusInfo(at(root, '#lane'), mac)).toBeNull();
    at(root, '#canvas').setAttribute('data-selection-edge', 'start');
    expect(resolveStatusInfo(at(root, '#lane'), mac)).toBe('Click and drag to move left selection boundary');
    at(root, '#canvas').setAttribute('data-selection-edge', 'end');
    expect(resolveStatusInfo(at(root, '#lane'), mac)).toBe('Click and drag to move right selection boundary');
    at(root, '#canvas').removeAttribute('data-selection-edge');
    at(root, '#env').setAttribute('data-envelope-hover', 'curve');
    expect(resolveStatusInfo(at(root, '#envInner'), mac)).toBe('Click to create new envelope point.');
    at(root, '#env').setAttribute('data-envelope-hover', 'point');
    expect(resolveStatusInfo(at(root, '#envInner'), mac)).toBe('Click and drag to move point, click to delete.');
    expect(resolveStatusInfo(at(root, '#ruler'), mac)).toBe('Right-click for timeline options.');
    expect(resolveStatusInfo(at(root, '#ticks'), mac)).toBe('Right-click for menu.');
    expect(resolveStatusInfo(at(root, '[aria-label="Close effects panel"]'), mac)).toBe('Close effects panel');
    expect(resolveStatusInfo(at(root, '[aria-label="Disable all track effects"]'), mac)).toBe('Click to toggle track effects on/off.');
    expect(resolveStatusInfo(at(root, '[aria-label="Enable all master effects"]'), mac)).toBe('Click to toggle master effects on/off.');
    expect(resolveStatusInfo(at(root, '.effect-slot__drag-handle'), mac)).toBe('Click and drag to reorder effects.');
    expect(resolveStatusInfo(at(root, '[aria-label="Disable effect"]'), mac)).toBe('Click to toggle effect on/off.');
    expect(resolveStatusInfo(at(root, '.effect-slot__name-field'), mac)).toBe('Click to open effect window.');
    expect(resolveStatusInfo(at(root, '.effect-slot__settings-button'), mac)).toBe('Click to open context menu.');
    expect(resolveStatusInfo(at(root, '#add'), mac)).toBe('Add effect');
    expect(resolveStatusInfo(at(root, '#other'), mac)).toBeNull();
    expect(resolveStatusInfo(null, mac)).toBeNull();
  });
});
