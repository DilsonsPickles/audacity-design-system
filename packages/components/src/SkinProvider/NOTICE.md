# Skin source and asset notices

The skin palettes, decorative SVGs, CSS treatments, URL preview controller,
carousel and preview adaptation originate in Soundscaper, branch
`feat/editor-skins`, through commit `368876190`:
<https://github.com/LeoWattenberg/Soundscaper>.

Transferred files retain AGPL-3.0-only licensing. These additions do not relicense
unrelated design-system code. Full terms are in `licenses/AGPL-3.0.txt`.
The provider, selector and scope adapters were adapted for the design-system
package on 2026-09-09. Soundscaper-specific controllers and workspace selectors
were replaced with component props and opt-in presentation attributes.

`appearance-previews.ts` adapts Audacity's
`src/appshell/qml/Audacity/AppShell/shared/internal/ThemeSample.qml` at commit
`16f2713979809abe7308b4e1e0d487afeece84f2`, copyright (C) 2021 MuseScore BVBA and
others, GPL-3.0-only. Its QML geometry was translated into SVG. Original SHA-256:
`1cdfd99389a128bfa113c86b7dd43a025db608c366d9e0aaaa66adb481a4b36a`.
Full terms are in `licenses/GPL-3.0.txt`.

Nunito Sans and JetBrains Mono are self-hosted via Fontsource 5.3.0. Their OFL
notices are retained in `licenses/Nunito-Sans.txt` and `licenses/JetBrains-Mono.txt`.
Fonts load only when their families are used. Artwork is repository-native SVG.
