# Editor skins

`SkinProvider` resolves Default, Sakura, Lilac and Techno independently of the
light/dark mode. `SkinSelector` supplies an accessible horizontal carousel for
an Appearance preferences page. Existing `ThemeProvider` consumers are unchanged.
The sandbox exposes the selector through its existing Preferences menu.

```tsx
import { SkinProvider, SkinSelector, type SkinId } from '@audacity-ui/components';

<SkinProvider skin={savedSkin} mode={mode}>
  <SkinSelector value={savedSkin} onChange={async (skin: SkinId) => {
    await persistSkin(skin);
    setSavedSkin(skin);
  }} />
  <div data-skin-surface="timeline">{/* timeline content */}</div>
</SkinProvider>
```

Import the normal component stylesheet. The provider entry includes its skin CSS.
`data-skin-surface="timeline"` or `"chrome"` opts a surface into artwork without
changing dimensions, spacing, panel arrangement or timeline geometry. Sakura
buttons use inset depth; timecode displays and their format arrows remain flat.
Lilac uses Inter/the host fallback, Sakura Nunito Sans, and Techno JetBrains Mono.

`?useskin=sakura` temporarily overrides `savedSkin`. Invalid or absent values fall
back to the saved value. Browsing the carousel does not select a skin. Selecting a
card or using **Keep this skin** awaits `onChange` before removing only `useskin`.
A rejected save leaves the preview active. **End preview** preserves the other
query parameters, hash and history state; browser Back/Forward updates the preview.
Preview state never enters the preferences blob. No reload or automatic rotation
is involved. Arrow keys (including RTL), Home/End, Tab and touch scrolling work.

The existing PreferencesProvider normalizes missing/invalid saved skins to Default
and writes an explicit skin selection before reporting success. Consumer apps with
other persistence services use `onChange` as the persistence boundary.

Dropdown and Tooltip portals carry the skin scope automatically. Wrap additional
consumer-owned portals with `<SkinScope>` inside the portal's content; it obtains
its skin through React context without modifying document.body or other editors.

Pass `highContrast` to suppress skins and retain the saved choice. Pass the host's
existing `highContrastTheme` alongside it to retain that theme's colors. Native
forced-colors mode suppresses artwork and raised edges. `previewBrowser` permits
injected browser resources, or `null` to disable URL previews (SSR supported).
English and German selector labels are exported as `skinSelectorEnglish` and
`skinSelectorGerman`; other locales can supply the same labels shape.

See [NOTICE.md](NOTICE.md) for retained source/asset licenses.
