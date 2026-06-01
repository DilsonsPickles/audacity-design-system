// Right-click-style picker for adding a new effect to a stack. Built-in
// effects come from EFFECT_REGISTRY; anything the user has bought from the
// MuseHub marketplace is appended as additional vendor-grouped submenus.
// "Get effects…" hands off to the marketplace for everything else.

import React from 'react';
import { ContextMenu, ContextMenuItem } from '@audacity-ui/components';
import { EFFECT_REGISTRY, type EffectDefinition } from '@audacity-ui/core';

export interface PurchasedPickerEffect {
  id: string;
  name: string;
  vendor: string;
}

export interface EffectPickerMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  /** Effects the user has bought from MuseHub this session — grouped by vendor
   *  and rendered after the built-in categories. */
  purchasedEffects?: PurchasedPickerEffect[];
  /** IDs the user has disabled in the Plugin Manager — those effects are
   *  filtered out of the menu so they read as unavailable. */
  disabledPluginIds?: Set<string>;
  onClose: () => void;
  /** Picked an installed effect (built-in or purchased) from a submenu. */
  onPickEffect: (effect: { id: string; name: string }) => void;
  /** "Get effects…" — open the MuseHub marketplace. */
  onOpenMarketplace: () => void;
}

export const EffectPickerMenu: React.FC<EffectPickerMenuProps> = ({
  isOpen,
  x,
  y,
  purchasedEffects = [],
  disabledPluginIds,
  onClose,
  onPickEffect,
  onOpenMarketplace,
}) => {
  const isEnabled = (id: string) => !disabledPluginIds || !disabledPluginIds.has(id);

  // Group purchased effects by vendor so each one becomes its own submenu —
  // and drop anything the user has disabled in the Plugin Manager.
  const purchasedByVendor = React.useMemo(() => {
    const map = new Map<string, PurchasedPickerEffect[]>();
    for (const effect of purchasedEffects) {
      if (!isEnabled(effect.id)) continue;
      const list = map.get(effect.vendor) ?? [];
      list.push(effect);
      map.set(effect.vendor, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasedEffects, disabledPluginIds]);

  return (
    <ContextMenu isOpen={isOpen} onClose={onClose} x={x} y={y}>
      {Object.entries(EFFECT_REGISTRY).map(([category, effects]) => {
        const enabled = (effects as EffectDefinition[]).filter((e) => isEnabled(e.id));
        if (enabled.length === 0) return null;
        return (
          <ContextMenuItem key={category} label={category} hasSubmenu>
            {enabled.map((effect) => (
              <ContextMenuItem
                key={effect.id}
                label={effect.name}
                onClick={() => {
                  onPickEffect({ id: effect.id, name: effect.name });
                  onClose();
                }}
              />
            ))}
          </ContextMenuItem>
        );
      })}
      {purchasedByVendor.map(([vendor, effects]) => (
        <ContextMenuItem key={vendor} label={vendor} hasSubmenu>
          {effects.map((effect) => (
            <ContextMenuItem
              key={effect.id}
              label={effect.name}
              onClick={() => {
                onPickEffect({ id: effect.id, name: effect.name });
                onClose();
              }}
            />
          ))}
        </ContextMenuItem>
      ))}
      <ContextMenuItem isDivider />
      <ContextMenuItem
        label="Get effects…"
        onClick={() => {
          onOpenMarketplace();
          onClose();
        }}
      />
    </ContextMenu>
  );
};

export default EffectPickerMenu;
