# Waveform column alignment

Fractional clip widths and display scales put adjacent one-CSS-pixel rectangles
between physical pixels. Canvas anti-aliases them independently, leaving partly
transparent seams. Their changing coverage appears as a false gradient that
changes as clips resize or scroll.

ClipBody now maps its canvas to the actual integer backing-buffer dimensions and
snaps adjacent peak/RMS columns to shared physical-pixel boundaries. Envelope,
sample selection and waveform colors retain their existing behavior. This is
independent of skins and does not change source audio or clip geometry.

Regression tests cover integer/fractional display scales and a 163.5px clip width.
The shared test canvas stub implements the standard getTransform method used to
read the physical scale. Run the component suite with:

```sh
pnpm --filter @audacity-ui/tokens build
pnpm --filter @audacity-ui/core build
pnpm --filter @audacity-ui/components test
pnpm --filter @audacity-ui/components build
```

The branch is based directly on upstream/master and can be reviewed independently
of the editor-skins branch.
