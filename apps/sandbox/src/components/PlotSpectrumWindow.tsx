import React from 'react';
import { Dialog, DialogFooter, Dropdown, LabeledCheckbox, Button, ToolButton, ContextMenu, ContextMenuItem, useTheme, toast } from '@audacity-ui/components';
import {
  computeSpectrum, spectrumDbAt, frequencyTicks, formatHzTick, noteName, formatHz, formatPlotTime, formatPlotDuration, spectrumCsv,
  WINDOW_FUNCTIONS, SPECTRUM_SIZES, SPECTRUM_ALGORITHMS, type Spectrum, type WindowFunctionId,
} from '../utils/spectrum';
import { downloadBlob } from '../utils/downloadBlob';
import { PopoutPanel } from './editor/PopoutPanel';
import './PlotSpectrumWindow.css';

/**
 * PLOT SPECTRUM (2026-11-16, the Figma "Plot spectrum" flow in 44 -
 * Analyzers, "build it with click-to-focus and a Select action"): a
 * NON-MODAL window — the project stays usable, so a selection is made,
 * PLOTTED, another made and plotted beside it, to COMPARE (Audacity 3's
 * Frequency Analysis replaced its one curve on every Replot). Every curve
 * is a row in the table; ONE set of Algorithm / Function / Size applies to
 * all of them, re-plotted when it changes, so a comparison stays fair.
 * A click on a row FOCUSES its curve (drawn on top, the others dimmed) and
 * changes nothing in the project; the row's SELECT action puts the
 * project's selection back to the range it was plotted from.
 */

export interface PlotSpectrumTrack {
  id: number | string;
  name: string;
  /** the track's colour name from the clip palette ('blue', 'violet', …) —
   *  a new plot takes the first track's colour (2026-11-17) */
  color?: string;
}

export interface PlotSpectrumSource {
  startTime: number;
  endTime: number;
  /** the tracks the selection covers, in order */
  tracks: PlotSpectrumTrack[];
}

export interface PlotSpectrumWindowProps {
  isOpen: boolean;
  onClose: () => void;
  os?: 'macos' | 'windows';
  /** the project's selection now, or null with none to plot */
  selection: PlotSpectrumSource | null;
  /** mono samples of a range on some tracks, or null when there is no audio */
  readRegion: (trackIds: (number | string)[], startTime: number, endTime: number) => { samples: Float32Array; sampleRate: number } | null;
  /** the Select action: make this the project's selection again */
  onSelectRange: (source: PlotSpectrumSource) => void;
  /** open as an OS window (the default); false = the in-app window */
  osWindow?: boolean;
}

interface Plot {
  id: number;
  name: string;
  colour: string;
  source: PlotSpectrumSource;
  samples: Float32Array;
  sampleRate: number;
}

/** Curve colours on the dark graph — distinct from each other and from the
 *  grid; the FALLBACK for a track with no palette colour */
export const PLOT_COLOURS = ['#B6F35A', '#FFC542', '#6FC3FF', '#FF7A9C', '#C79BFF', '#5EE0C1', '#FF9F5A', '#F2F2F2'];

/** The clip palette's names, in the track palette's order — the row menu's
 *  choices, resolved to each colour's clip-header hex (vivid pastels that
 *  read on the dark graph) */
export const PLOT_COLOUR_CHOICES = ['blue', 'violet', 'magenta', 'teal', 'cyan', 'green', 'orange', 'red', 'yellow'] as const;

/** The visible dB span, zoomed by the magnifiers (Audacity 3's slider zooms the same axis) */
export const DB_RANGES = [144, 120, 96, 72, 48, 24];
const DEFAULT_RANGE_INDEX = 2;

/** Audacity 3 analyses at most this many samples of a selection */
export const MAX_ANALYSED_SAMPLES = 10 * 1024 * 1024;

/** the graph's width before it has been measured */
const DEFAULT_GRAPH_W = 560;
/** the graph's height before it has been measured, and its least */
const DEFAULT_GRAPH_H = 320;
const LOG_MIN_HZ = 10;

export function tracksLabel(tracks: PlotSpectrumTrack[]): string {
  if (tracks.length === 0) return 'No track';
  if (tracks.length === 1) return tracks[0].name;
  return `${tracks.length} tracks`;
}

export function PlotSpectrumWindow({ isOpen, onClose, os, selection, readRegion, onSelectRange, osWindow = true }: PlotSpectrumWindowProps) {
  const [popupBlocked, setPopupBlocked] = React.useState(false);
  const { theme } = useTheme();
  const [plots, setPlots] = React.useState<Plot[]>([]);
  const [focusedId, setFocusedId] = React.useState<number | null>(null);
  const [linear, setLinear] = React.useState(false);
  // Grid lines are ON by default (2026-11-17, "grid lines should be on
  // by default") — the checkbox turns them off
  const [grid, setGrid] = React.useState(true);
  const [rangeIndex, setRangeIndex] = React.useState(DEFAULT_RANGE_INDEX);
  const [windowFn, setWindowFn] = React.useState<WindowFunctionId>('hann');
  const [size, setSize] = React.useState(2048);
  const [hover, setHover] = React.useState<{ x: number; y: number } | null>(null);
  // THE GRAPH'S REAL WIDTH: the curve is drawn a column per pixel and the
  // frequency grid is chosen for it, so a wider window shows more
  const [graphW, setGraphW] = React.useState(DEFAULT_GRAPH_W);
  // …and its real HEIGHT: it takes the window's spare height (2026-11-16,
  // "make the graph a bit taller" — the table fits its rows instead)
  const [graphH, setGraphH] = React.useState(DEFAULT_GRAPH_H);
  const [graphEl, setGraphEl] = React.useState<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!graphEl) return;
    const measure = () => {
      const w = Math.round(graphEl.clientWidth);
      const h = Math.round(graphEl.clientHeight);
      if (w > 0) setGraphW(w);
      if (h > 0) setGraphH(h);
    };
    measure();
    const RO = graphEl.ownerDocument.defaultView?.ResizeObserver ?? (typeof ResizeObserver !== 'undefined' ? ResizeObserver : null);
    if (!RO) return;
    const ro = new RO(measure);
    ro.observe(graphEl);
    return () => ro.disconnect();
  }, [graphEl]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const nextId = React.useRef(1);
  // the row's ⋯ menu: which plot, where, and in which document (the OS
  // window's menu must stay in its window — ContextMenu.portalTo)
  const [colourMenu, setColourMenu] = React.useState<{ id: number; x: number; y: number; doc: Document } | null>(null);

  // THE PLOT'S COLOUR IS THE TRACK'S (2026-11-17, "the plot color [should]
  // match the track color"): a palette name resolved to its clip-header
  // hex — the vivid pastels read on the dark graph
  const clipHex: Record<string, string> = {
    blue: theme.audio.clip.blue.header,
    violet: theme.audio.clip.violet.header,
    magenta: theme.audio.clip.magenta.header,
    teal: theme.audio.clip.teal.header,
    cyan: theme.audio.clip.cyan.header,
    green: theme.audio.clip.green.header,
    orange: theme.audio.clip.orange.header,
    red: theme.audio.clip.red.header,
    yellow: theme.audio.clip.yellow.header,
  };

  // Every curve re-plotted with the current settings
  const spectra = React.useMemo(() => {
    const map = new Map<number, Spectrum>();
    for (const p of plots) map.set(p.id, computeSpectrum(p.samples, p.sampleRate, size, windowFn));
    return map;
  }, [plots, size, windowFn]);

  React.useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const plotSelection = () => {
    if (!selection) return;
    const region = readRegion(selection.tracks.map((t) => t.id), selection.startTime, selection.endTime);
    if (!region || !region.samples.some((s) => s !== 0)) {
      setNotice('No audio in the selection to plot');
      return;
    }
    const samples = region.samples.length > MAX_ANALYSED_SAMPLES ? region.samples.slice(0, MAX_ANALYSED_SAMPLES) : region.samples;
    const id = nextId.current++;
    // the first track's colour; the fixed set stands in for a track
    // without one, and the row's ⋯ menu changes it either way
    const used = new Set(plots.map((p) => p.colour));
    const colour = clipHex[selection.tracks[0]?.color ?? '']
      ?? PLOT_COLOURS.find((c) => !used.has(c))
      ?? PLOT_COLOURS[(id - 1) % PLOT_COLOURS.length];
    setPlots((ps) => [...ps, { id, name: `Plot ${id}`, colour, source: selection, samples, sampleRate: region.sampleRate }]);
  };

  const removePlot = (id: number) => {
    setPlots((ps) => ps.filter((p) => p.id !== id));
    if (focusedId === id) setFocusedId(null);
  };

  const setPlotColour = (id: number, colour: string) => {
    setPlots((ps) => ps.map((p) => (p.id === id ? { ...p, colour } : p)));
  };

  // OPENING WITH A SELECTION PLOTS IT (2026-11-17, "when I have a
  // selection and I use Analyze -> Plot spectrum, it should plot the
  // selection I have"): the menu lands on a drawn curve, not an empty
  // graph; the Plot selection button stays the door for further curves.
  // The window keeps its state across close (it renders null, mounted),
  // so a reopen with a range already plotted adds no duplicate curve.
  const autoPlotArmedRef = React.useRef(true);
  React.useEffect(() => {
    if (!isOpen) {
      autoPlotArmedRef.current = true;
      return;
    }
    if (!autoPlotArmedRef.current) return;
    autoPlotArmedRef.current = false;
    if (!selection) return;
    const already = plots.some((p) =>
      p.source.startTime === selection.startTime
      && p.source.endTime === selection.endTime
      && p.source.tracks.length === selection.tracks.length
      && p.source.tracks.every((t, i) => t.id === selection.tracks[i].id));
    if (!already) plotSelection();
    // Only the open/close edge arms it — the selection is read at open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const exportCsv = () => {
    const curves = plots.map((p) => ({ name: p.name, spectrum: spectra.get(p.id)! }));
    downloadBlob(new Blob([spectrumCsv(curves)], { type: 'text/csv' }), 'spectrum.csv');
    toast.success('Spectrum exported', 'Downloads/spectrum.csv');
  };

  // ── axes ──
  const nyquist = plots.length > 0 ? Math.max(...plots.map((p) => p.sampleRate / 2)) : 22050;
  const fMin = linear ? 0 : LOG_MIN_HZ;
  const fMax = nyquist;
  const hzToX = (hz: number) => (linear
    ? (hz / fMax) * graphW
    : (Math.log10(Math.max(hz, fMin) / fMin) / Math.log10(fMax / fMin)) * graphW);
  const xToHz = (x: number) => (linear
    ? (x / graphW) * fMax
    : fMin * 10 ** ((x / graphW) * Math.log10(fMax / fMin)));
  const range = DB_RANGES[rangeIndex];
  // the top follows the loudest curve, rounded up to 6 dB
  const peak = Math.max(-150, ...[...spectra.values()].map((s) => Math.max(...s.db.subarray(1))));
  const dbTop = plots.length > 0 ? Math.min(12, Math.ceil(peak / 6) * 6) : 0;
  const dbBottom = dbTop - range;
  const dbToY = (db: number) => ((dbTop - db) / range) * graphH;
  // dB lines about 22px apart or more: denser as the graph gets taller
  const dbStep = [3, 6, 12, 24].find((st) => (st / range) * graphH >= 22) ?? 24;
  const dbTicks: number[] = [];
  for (let d = dbTop; d >= dbBottom; d -= dbStep) dbTicks.push(d);
  const { grid: hzGrid, labels: hzTicks } = frequencyTicks(fMin, fMax, linear, graphW);

  // one point per pixel column: the loudest bin that falls in it — the
  // readout reads the same, so it sits ON the drawn line, at the peak's
  // own frequency
  const columnPeak = (spectrum: Spectrum, x: number): { hz: number; db: number; k: number } => {
    const lo = xToHz(x);
    const hi = xToHz(x + 1);
    const k0 = Math.max(1, Math.floor(lo / spectrum.binHz));
    const k1 = Math.min(spectrum.db.length - 1, Math.ceil(hi / spectrum.binHz));
    if (k1 <= k0) return { hz: lo, db: spectrumDbAt(spectrum, lo), k: Math.round(lo / spectrum.binHz) };
    let best = k0;
    for (let k = k0 + 1; k <= k1; k++) if (spectrum.db[k] > spectrum.db[best]) best = k;
    return { hz: best * spectrum.binHz, db: spectrum.db[best], k: best };
  };
  const pathFor = (spectrum: Spectrum) => {
    let d = '';
    for (let x = 0; x <= graphW; x++) {
      const v = columnPeak(spectrum, x).db;
      const y = Math.min(graphH, Math.max(0, dbToY(v)));
      d += `${x === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`;
    }
    return d;
  };

  // the readout follows the focused curve, else the newest
  const readoutPlot = plots.find((p) => p.id === focusedId) ?? plots[plots.length - 1];
  // ONE READING (2026-11-17, "remove the peak label, we just need to show
  // the cursor value" — the 2026-11-16 readout had Cursor AND Peak): the
  // CURSOR is the POINTER'S place on the graph — the frequency under it
  // and the level at its height. The LINE's value in the pointer's column
  // is still computed for the dot the readout rides, but is not written.
  const readoutSpectrum = readoutPlot ? spectra.get(readoutPlot.id)! : null;
  const cursorReading = hover && readoutSpectrum
    ? { hz: xToHz(hover.x), db: dbTop - (hover.y / graphH) * range }
    : null;
  const lineReading = hover && readoutSpectrum
    ? columnPeak(readoutSpectrum, Math.min(graphW, Math.floor(hover.x)))
    : null;

  const drawOrder = [...plots].sort((a, b) => (a.id === focusedId ? 1 : 0) - (b.id === focusedId ? 1 : 0));

  const style = {
    '--ps-text': theme.foreground.text.primary,
    '--ps-text-2': theme.foreground.text.secondary,
    '--ps-border': theme.border.default,
    '--ps-table-bg': theme.background.table.background,
    '--ps-table-head': theme.background.table.header.background,
    '--ps-table-line': theme.background.table.row.border,
    '--ps-row-hover': theme.background.table.row.hover,
    '--ps-row-focus': theme.background.table.row.selected,
    '--ps-link': theme.foreground.text.link,
    '--ps-well': theme.background.surface.inset,
  } as React.CSSProperties;

  const footer = (
    <DialogFooter
      primaryText="Done"
      secondaryText="Export"
      onPrimaryClick={onClose}
      onSecondaryClick={exportCsv}
      secondaryDisabled={plots.length === 0}
    />
  );

  // THE SELECTION BAR IS A FULL-BLEED STRIP UNDER THE TITLE BAR, outside
  // the scroll (2026-11-16, "if it does need to scroll, the action bar at
  // the top should be a full bleed element and the graph can scroll
  // underneath"): the input and the main action never scroll away; the
  // in-app window puts it in the Dialog's header slot, the OS window
  // between its title bar and its body
  const selectionBar = (
      <div className="plot-spectrum__selection" data-plot-selection style={style}>
          <span className="plot-spectrum__selection-label">Selection</span>
          {notice ? (
            <span className="plot-spectrum__notice" role="status">{notice}</span>
          ) : selection ? (
            <span className="plot-spectrum__selection-value">
              <strong>{tracksLabel(selection.tracks)}</strong>
              <span>{formatPlotTime(selection.startTime)} – {formatPlotTime(selection.endTime)}</span>
              <span className="plot-spectrum__selection-duration">{formatPlotDuration(selection.endTime - selection.startTime)}</span>
            </span>
          ) : (
            <span className="plot-spectrum__none">None — select some audio in the project</span>
          )}
          <span className="plot-spectrum__spacer" />
          <Button variant="secondary" size="small" disabled={!selection} onClick={plotSelection}>Plot selection</Button>
      </div>
  );

  const body = (
      <div className="plot-spectrum" data-plot-spectrum style={style}>
        <div className="plot-spectrum__bar">
          <LabeledCheckbox label="Linear frequency scale" checked={linear} onChange={setLinear} />
          <LabeledCheckbox label="Grid lines" checked={grid} onChange={setGrid} />
          <span className="plot-spectrum__spacer" />
          <ToolButton icon="zoom-in" ariaLabel="Zoom in" onClick={() => setRangeIndex((i) => Math.min(DB_RANGES.length - 1, i + 1))} disabled={rangeIndex === DB_RANGES.length - 1} />
          <ToolButton icon="zoom-out" ariaLabel="Zoom out" onClick={() => setRangeIndex((i) => Math.max(0, i - 1))} disabled={rangeIndex === 0} />
        </div>

        <div className="plot-spectrum__graph-wrap">
          <div className="plot-spectrum__db-axis" aria-hidden>
            {dbTicks.map((d) => (
              <span key={d} style={{ top: dbToY(d) }}>{d}<small>dB</small></span>
            ))}
          </div>
          <div
            className="plot-spectrum__graph"
            ref={setGraphEl}
            data-plot-spectrum-graph
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHover({
                x: Math.max(0, Math.min(graphW, ((e.clientX - r.left) / r.width) * graphW)),
                y: Math.max(0, Math.min(graphH, ((e.clientY - r.top) / r.height) * graphH)),
              });
            }}
            onMouseLeave={() => setHover(null)}
          >
            <svg viewBox={`0 0 ${graphW} ${graphH}`} preserveAspectRatio="none" role="img" aria-label={plots.length ? `Spectrum of ${plots.map((p) => p.name).join(', ')}` : 'No spectrum plotted'}>
              {grid && dbTicks.map((d) => <line key={`h${d}`} className="plot-spectrum__grid" x1={0} x2={graphW} y1={dbToY(d)} y2={dbToY(d)} />)}
              {grid && hzGrid.map((h) => <line key={`v${h}`} className="plot-spectrum__grid" x1={hzToX(h)} x2={hzToX(h)} y1={0} y2={graphH} />)}
              {(() => {
                // EVERY CURVE IS FILLED (2026-11-16, "I really like the
                // transparent body under the curve... can we keep it when we
                // have multiple curves?"): all the fills first, every line on
                // top, so no fill hides a line; fainter when several overlap,
                // and a dimmed curve's fill dims with it
                const lines = drawOrder.map((p) => ({ p, d: pathFor(spectra.get(p.id)!) }));
                return (
                  <>
                    {lines.map(({ p, d }) => (
                      <path
                        key={`fill-${p.id}`}
                        d={`${d}L${graphW},${graphH}L0,${graphH}Z`}
                        fill={p.colour}
                        className="plot-spectrum__fill"
                        data-plot-fill={p.id}
                        data-several={plots.length > 1 ? '' : undefined}
                        data-dimmed={focusedId !== null && focusedId !== p.id ? '' : undefined}
                      />
                    ))}
                    {lines.map(({ p, d }) => (
                      <path
                        key={p.id}
                        d={d}
                        stroke={p.colour}
                        className="plot-spectrum__curve"
                        data-plot-curve={p.id}
                        data-dimmed={focusedId !== null && focusedId !== p.id ? '' : undefined}
                        data-focused={focusedId === p.id ? '' : undefined}
                      />
                    ))}
                  </>
                );
              })()}
              {hover && plots.length > 0 && (
                <>
                  <line className="plot-spectrum__crosshair" x1={hover.x} x2={hover.x} y1={0} y2={graphH} />
                  <line className="plot-spectrum__crosshair" x1={0} x2={graphW} y1={hover.y} y2={hover.y} />
                </>
              )}
            </svg>
            {plots.length === 0 && (
              <p className="plot-spectrum__empty">Make a selection, then press Plot selection</p>
            )}
            {plots.length > 0 && (
              <ul className="plot-spectrum__legend" aria-label="Curves">
                {plots.map((p) => (
                  <li key={p.id} data-dimmed={focusedId !== null && focusedId !== p.id ? '' : undefined}>
                    <i style={{ background: p.colour }} />{p.name}
                  </li>
                ))}
              </ul>
            )}
            {cursorReading && lineReading && readoutPlot && (() => {
              const yPct = (db: number) => (Math.max(0, Math.min(graphH, dbToY(db))) / graphH) * 100;
              // the DOT marks the line's value under the pointer
              const cx = (hover!.x / graphW) * 100;
              const ly = yPct(lineReading.db);
              return (
                <>
                  <span className="plot-spectrum__line-dot" data-plot-line-dot style={{ left: `${cx}%`, top: `${ly}%`, background: readoutPlot.colour }} />
                  <div
                    className="plot-spectrum__readout"
                    data-plot-readout
                    // near either side it hangs inward, so it stays in the window
                    data-edge={hover!.x < graphW * 0.2 ? 'start' : hover!.x > graphW * 0.8 ? 'end' : undefined}
                    // it RIDES THE CURVE with the dot ("I liked the peak
                    // riding the curve like that"), the crosshair marks the pointer
                    style={{ left: `${cx}%`, top: `${ly}%` }}
                  >
                    <span data-plot-cursor-reading>{formatHz(cursorReading.hz)} ({noteName(cursorReading.hz)})</span>
                    <span>{cursorReading.db.toFixed(1)} dB</span>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="plot-spectrum__hz-axis" aria-hidden>
            {hzTicks.map((h) => (
              <span key={h} style={{ left: `${(hzToX(h) / graphW) * 100}%` }}>{formatHzTick(h)}<small>Hz</small></span>
            ))}
          </div>
        </div>

        <div className="plot-spectrum__settings">
          <label>
            <span>Algorithm</span>
            <Dropdown
              value="spectrum"
              options={SPECTRUM_ALGORITHMS.map((a) => ({ value: a.id, label: a.label, disabled: !a.built }))}
            />
          </label>
          <label>
            <span>Function</span>
            <Dropdown value={windowFn} options={WINDOW_FUNCTIONS.map((w) => ({ value: w.id, label: w.label }))} onChange={(v) => setWindowFn(v as WindowFunctionId)} />
          </label>
          <label>
            <span>Size</span>
            <Dropdown value={String(size)} options={SPECTRUM_SIZES.map((s) => ({ value: String(s), label: String(s) }))} onChange={(v) => setSize(Number(v))} />
          </label>
        </div>

        <div className="plot-spectrum__table" role="table" aria-label="Plotted curves" data-plot-table>
          <div className="plot-spectrum__row plot-spectrum__row--head" role="row">
            {['Curve', 'Track', 'Start', 'Finish', 'Duration', 'Actions'].map((h) => <span key={h} role="columnheader">{h}</span>)}
          </div>
          <div className="plot-spectrum__body">
            {plots.length === 0 && (
              <div className="plot-spectrum__row plot-spectrum__row--empty" role="row">
                <span role="cell">Plotted curves appear here</span>
              </div>
            )}
            {plots.map((p) => (
              <div
                key={p.id}
                role="row"
                tabIndex={0}
                aria-selected={focusedId === p.id}
                className="plot-spectrum__row"
                data-plot-row={p.id}
                data-focused={focusedId === p.id ? '' : undefined}
                // CLICK-TO-FOCUS: the curve comes to the front, the others
                // dim; the project is not touched. A second click lets go.
                onClick={() => setFocusedId((f) => (f === p.id ? null : p.id))}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocusedId((f) => (f === p.id ? null : p.id)); }
                  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); removePlot(p.id); }
                }}
              >
                <span role="cell"><i className="plot-spectrum__swatch" style={{ background: p.colour }} />{p.name}</span>
                <span role="cell">{tracksLabel(p.source.tracks)}</span>
                <span role="cell">{formatPlotTime(p.source.startTime)}</span>
                <span role="cell">{formatPlotTime(p.source.endTime)}</span>
                <span role="cell">{formatPlotDuration(p.source.endTime - p.source.startTime)}</span>
                <span role="cell" className="plot-spectrum__actions">
                  <button type="button" data-plot-select={p.id} onClick={(e) => { e.stopPropagation(); onSelectRange(p.source); }}>Select</button>
                  <button type="button" data-plot-remove={p.id} onClick={(e) => { e.stopPropagation(); removePlot(p.id); }}>Remove</button>
                  <button
                    type="button"
                    className="plot-spectrum__menu-button"
                    data-plot-menu={p.id}
                    aria-label={`${p.name} options`}
                    aria-haspopup="menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect();
                      setColourMenu({ id: p.id, x: r.left, y: r.bottom + 2, doc: e.currentTarget.ownerDocument });
                    }}
                  >⋯</button>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* THE ROW'S ⋯ MENU: the plot's colour (2026-11-17, "perhaps we
            also need an option to change the plot color. A menu button on
            each table item") — the clip palette by name, the current one
            checked; portalled to the row's own document so the OS
            window's menu stays in its window */}
        {colourMenu && (() => {
          const plot = plots.find((p) => p.id === colourMenu.id);
          if (!plot) return null;
          const close = () => setColourMenu(null);
          return (
            <ContextMenu isOpen onClose={close} x={colourMenu.x} y={colourMenu.y} portalTo={colourMenu.doc.body} className="plot-spectrum__colour-menu">
              {PLOT_COLOUR_CHOICES.map((c) => (
                <ContextMenuItem
                  key={c}
                  label={c[0].toUpperCase() + c.slice(1)}
                  checked={plot.colour === clipHex[c]}
                  icon={<i className="plot-spectrum__menu-swatch" style={{ background: clipHex[c] }} />}
                  onClick={() => setPlotColour(plot.id, clipHex[c])}
                  onClose={close}
                />
              ))}
            </ContextMenu>
          );
        })()}

      </div>
  );

  if (!isOpen) return null;

  // AN OS WINDOW (2026-11-16, "that window has got to be able to float
  // outside the application window. We did it with the floating panels"):
  // the panels' PopoutPanel, so it can sit on another display beside the
  // project. The in-app non-modal window is the fallback for a browser
  // that blocks the popup.
  if (osWindow && !popupBlocked) {
    return (
      <PopoutPanel title="Plot spectrum" width={672} height={760} frame="dialog" os={os} onClose={onClose} onBlocked={() => setPopupBlocked(true)}>
        {selectionBar}
        <div className="dialog__body plot-spectrum-body">{body}</div>
        {footer}
      </PopoutPanel>
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      title="Plot spectrum"
      onClose={onClose}
      os={os}
      nonModal
      loopTab
      closeOnClickOutside={false}
      className="plot-spectrum-window"
      width={640}
      minHeight={0}
      headerContent={selectionBar}
      footer={footer}
    >
      {body}
    </Dialog>
  );
}
