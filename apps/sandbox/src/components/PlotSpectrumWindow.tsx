import React from 'react';
import { Dialog, DialogFooter, Dropdown, LabeledCheckbox, Button, ToolButton, useTheme, toast } from '@audacity-ui/components';
import {
  computeSpectrum, spectrumDbAt, noteName, formatHz, formatPlotTime, formatPlotDuration, spectrumCsv,
  WINDOW_FUNCTIONS, SPECTRUM_SIZES, SPECTRUM_ALGORITHMS, type Spectrum, type WindowFunctionId,
} from '../utils/spectrum';
import { downloadBlob } from '../utils/downloadBlob';
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
}

interface Plot {
  id: number;
  name: string;
  colour: string;
  source: PlotSpectrumSource;
  samples: Float32Array;
  sampleRate: number;
}

/** Curve colours on the dark graph — distinct from each other and from the grid */
export const PLOT_COLOURS = ['#B6F35A', '#FFC542', '#6FC3FF', '#FF7A9C', '#C79BFF', '#5EE0C1', '#FF9F5A', '#F2F2F2'];

/** The visible dB span, zoomed by the magnifiers (Audacity 3's slider zooms the same axis) */
export const DB_RANGES = [144, 120, 96, 72, 48, 24];
const DEFAULT_RANGE_INDEX = 2;

/** Audacity 3 analyses at most this many samples of a selection */
export const MAX_ANALYSED_SAMPLES = 10 * 1024 * 1024;

const GRAPH_W = 560;
const GRAPH_H = 240;
const LOG_MIN_HZ = 10;

export function tracksLabel(tracks: PlotSpectrumTrack[]): string {
  if (tracks.length === 0) return 'No track';
  if (tracks.length === 1) return tracks[0].name;
  return `${tracks.length} tracks`;
}

export function PlotSpectrumWindow({ isOpen, onClose, os, selection, readRegion, onSelectRange }: PlotSpectrumWindowProps) {
  const { theme } = useTheme();
  const [plots, setPlots] = React.useState<Plot[]>([]);
  const [focusedId, setFocusedId] = React.useState<number | null>(null);
  const [linear, setLinear] = React.useState(false);
  const [grid, setGrid] = React.useState(false);
  const [rangeIndex, setRangeIndex] = React.useState(DEFAULT_RANGE_INDEX);
  const [windowFn, setWindowFn] = React.useState<WindowFunctionId>('hann');
  const [size, setSize] = React.useState(2048);
  const [hoverX, setHoverX] = React.useState<number | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const nextId = React.useRef(1);

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
    const used = new Set(plots.map((p) => p.colour));
    const colour = PLOT_COLOURS.find((c) => !used.has(c)) ?? PLOT_COLOURS[(id - 1) % PLOT_COLOURS.length];
    setPlots((ps) => [...ps, { id, name: `Plot ${id}`, colour, source: selection, samples, sampleRate: region.sampleRate }]);
  };

  const removePlot = (id: number) => {
    setPlots((ps) => ps.filter((p) => p.id !== id));
    if (focusedId === id) setFocusedId(null);
  };

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
    ? (hz / fMax) * GRAPH_W
    : (Math.log10(Math.max(hz, fMin) / fMin) / Math.log10(fMax / fMin)) * GRAPH_W);
  const xToHz = (x: number) => (linear
    ? (x / GRAPH_W) * fMax
    : fMin * 10 ** ((x / GRAPH_W) * Math.log10(fMax / fMin)));
  const range = DB_RANGES[rangeIndex];
  // the top follows the loudest curve, rounded up to 6 dB
  const peak = Math.max(-150, ...[...spectra.values()].map((s) => Math.max(...s.db.subarray(1))));
  const dbTop = plots.length > 0 ? Math.min(12, Math.ceil(peak / 6) * 6) : 0;
  const dbBottom = dbTop - range;
  const dbToY = (db: number) => ((dbTop - db) / range) * GRAPH_H;
  const dbStep = range >= 96 ? 12 : 6;
  const dbTicks: number[] = [];
  for (let d = dbTop; d >= dbBottom; d -= dbStep) dbTicks.push(d);
  const hzTicks = linear
    ? Array.from({ length: Math.floor(fMax / (fMax > 12000 ? 2000 : 1000)) + 1 }, (_, i) => i * (fMax > 12000 ? 2000 : 1000)).filter((h) => h > 0)
    : [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].filter((h) => h > fMin && h < fMax);

  // one point per pixel column: the loudest bin that falls in it
  const pathFor = (spectrum: Spectrum) => {
    let d = '';
    for (let x = 0; x <= GRAPH_W; x++) {
      const lo = xToHz(x);
      const hi = xToHz(x + 1);
      const k0 = Math.max(1, Math.floor(lo / spectrum.binHz));
      const k1 = Math.min(spectrum.db.length - 1, Math.ceil(hi / spectrum.binHz));
      let v = -Infinity;
      if (k1 <= k0) v = spectrumDbAt(spectrum, lo);
      else for (let k = k0; k <= k1; k++) v = Math.max(v, spectrum.db[k]);
      const y = Math.min(GRAPH_H, Math.max(0, dbToY(v)));
      d += `${x === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`;
    }
    return d;
  };

  // the readout follows the focused curve, else the newest
  const readoutPlot = plots.find((p) => p.id === focusedId) ?? plots[plots.length - 1];
  const hoverHz = hoverX !== null ? xToHz(hoverX) : null;
  const hoverDb = hoverHz !== null && readoutPlot ? spectrumDbAt(spectra.get(readoutPlot.id)!, hoverHz) : null;

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
  } as React.CSSProperties;

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
      footer={
        <DialogFooter
          primaryText="Done"
          secondaryText="Export"
          onPrimaryClick={onClose}
          onSecondaryClick={exportCsv}
          secondaryDisabled={plots.length === 0}
        />
      }
    >
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
            data-plot-spectrum-graph
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHoverX(Math.max(0, Math.min(GRAPH_W, ((e.clientX - r.left) / r.width) * GRAPH_W)));
            }}
            onMouseLeave={() => setHoverX(null)}
          >
            <svg viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} preserveAspectRatio="none" role="img" aria-label={plots.length ? `Spectrum of ${plots.map((p) => p.name).join(', ')}` : 'No spectrum plotted'}>
              {grid && dbTicks.map((d) => <line key={`h${d}`} className="plot-spectrum__grid" x1={0} x2={GRAPH_W} y1={dbToY(d)} y2={dbToY(d)} />)}
              {grid && hzTicks.map((h) => <line key={`v${h}`} className="plot-spectrum__grid" x1={hzToX(h)} x2={hzToX(h)} y1={0} y2={GRAPH_H} />)}
              {drawOrder.map((p) => (
                <path
                  key={p.id}
                  d={pathFor(spectra.get(p.id)!)}
                  stroke={p.colour}
                  className="plot-spectrum__curve"
                  data-plot-curve={p.id}
                  data-dimmed={focusedId !== null && focusedId !== p.id ? '' : undefined}
                  data-focused={focusedId === p.id ? '' : undefined}
                />
              ))}
              {hoverX !== null && plots.length > 0 && (
                <line className="plot-spectrum__crosshair" x1={hoverX} x2={hoverX} y1={0} y2={GRAPH_H} />
              )}
              {hoverDb !== null && plots.length > 0 && (
                <line className="plot-spectrum__crosshair" x1={0} x2={GRAPH_W} y1={dbToY(hoverDb)} y2={dbToY(hoverDb)} />
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
            {hoverHz !== null && hoverDb !== null && readoutPlot && (
              <div
                className="plot-spectrum__readout"
                data-plot-readout
                style={{ left: `${(hoverX! / GRAPH_W) * 100}%`, top: `${(Math.max(0, dbToY(hoverDb)) / GRAPH_H) * 100}%` }}
              >
                {formatHz(hoverHz)} ({noteName(hoverHz)}) = {hoverDb.toFixed(1)} dB
              </div>
            )}
          </div>
          <div className="plot-spectrum__hz-axis" aria-hidden>
            {hzTicks.map((h) => (
              <span key={h} style={{ left: `${(hzToX(h) / GRAPH_W) * 100}%` }}>{h >= 1000 ? `${h / 1000}k` : h}<small>Hz</small></span>
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
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="plot-spectrum__selection" data-plot-selection>
          <strong>Selection:</strong>
          {notice ? (
            <span className="plot-spectrum__notice" role="status">{notice}</span>
          ) : selection ? (
            <>
              <span>{tracksLabel(selection.tracks)}</span>
              <span>Start: {formatPlotTime(selection.startTime)}</span>
              <span>End: {formatPlotTime(selection.endTime)}</span>
              <span>Duration: {formatPlotDuration(selection.endTime - selection.startTime)}</span>
            </>
          ) : (
            <span className="plot-spectrum__none">None — select some audio in the project</span>
          )}
          <span className="plot-spectrum__spacer" />
          <Button variant="secondary" size="small" disabled={!selection} onClick={plotSelection}>Plot selection</Button>
        </div>
      </div>
    </Dialog>
  );
}
