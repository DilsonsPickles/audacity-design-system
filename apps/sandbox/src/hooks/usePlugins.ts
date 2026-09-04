import React from 'react';
import type { Plugin } from '@audacity-ui/components';
import { createInitialPlugins } from '../data/plugins';
import { findMissingEffects } from '../utils/findMissingEffects';
import type { Track, Effect } from '../contexts/TracksContext';
import type { PurchasedEffect } from '../contexts/MuseHubContext';

export interface UsePluginsOptions {
  state: {
    tracks: Track[];
    masterEffects: Effect[];
  };
  showMissingPlugins: (names: string[]) => void;
  syncDisabledFromList: (list: { id: string; enabled: boolean }[]) => void;
  installedEffects: PurchasedEffect[];
}

export interface UsePluginsReturn {
  plugins: Plugin[];
  setPlugins: React.Dispatch<React.SetStateAction<Plugin[]>>;
  allPlugins: Plugin[];
  setPluginsWithSync: React.Dispatch<React.SetStateAction<Plugin[]>>;
}

/**
 * Owns the local Plugin Manager list, merges in installed MuseHub effects,
 * mirrors enabled/disabled state into MuseHubContext, and watches the
 * current project for effect ids that are neither built-in nor installed —
 * surfacing them via `showMissingPlugins`.
 */
export function usePlugins(options: UsePluginsOptions): UsePluginsReturn {
  const { state, showMissingPlugins, syncDisabledFromList, installedEffects } = options;

  // Convert EFFECT_REGISTRY to Plugin[] format for PluginManagerDialog
  const [plugins, setPlugins] = React.useState<Plugin[]>(createInitialPlugins);
  // Append currently-installed MuseHub plugins so they show up in the
  // Plugin Manager. Uninstalled-but-owned effects are not listed here —
  // they only live in the Owned view of the marketplace modal until the
  // user reinstalls them.
  const allPlugins = React.useMemo<Plugin[]>(() => {
    if (installedEffects.length === 0) return plugins;
    const existing = new Set(plugins.map((p) => p.id));
    const extras: Plugin[] = installedEffects
      .filter((e) => !existing.has(e.id))
      .map((e) => ({
        id: e.id,
        name: e.name,
        type: 'VST3',
        category: 'Effect',
        path: `/Library/Audio/Plug-Ins/VST3/MuseHub/${e.vendor}/${e.name}.vst3`,
        enabled: true,
      }));
    return [...plugins, ...extras];
  }, [plugins, installedEffects]);

  // Mirror the plugins' enabled/disabled state into the MuseHub context so
  // the picker context menu and slot caret menus filter disabled plugins out.
  React.useEffect(() => {
    syncDisabledFromList(allPlugins.map((p) => ({ id: p.id, enabled: p.enabled })));
  }, [allPlugins, syncDisabledFromList]);

  // Flag effects in the current project whose underlying plugins are no
  // longer available — signed out (lost entitlement) or locally uninstalled.
  // Mirrors how a real DAW shows "Missing plugin" warnings.
  //
  // Only fires when the set of missing names actually changes, so editing
  // tracks doesn't re-pop the modal.
  const lastMissingMissingRef = React.useRef<string>('');
  React.useEffect(() => {
    const installedIds = new Set(installedEffects.map((e) => e.id));
    const names = findMissingEffects({
      tracks: state.tracks,
      masterEffects: state.masterEffects,
      installedIds,
    });
    const sig = names.join('|');
    if (sig === lastMissingMissingRef.current) return;
    lastMissingMissingRef.current = sig;
    if (names.length > 0) showMissingPlugins(names);
  }, [
    installedEffects,
    state.tracks,
    state.masterEffects,
    showMissingPlugins,
  ]);

  // Intercept setPlugins from the Plugin Manager so toggling an enabled
  // state both updates the local Plugin[] and the shared disabled-IDs set.
  const setPluginsWithSync: React.Dispatch<React.SetStateAction<Plugin[]>> = React.useCallback(
    (update) => {
      setPlugins((prev) => {
        const next = typeof update === 'function' ? (update as (p: Plugin[]) => Plugin[])(prev) : update;
        syncDisabledFromList(next.map((p) => ({ id: p.id, enabled: p.enabled })));
        return next;
      });
    },
    [syncDisabledFromList],
  );

  return { plugins, setPlugins, allPlugins, setPluginsWithSync };
}
