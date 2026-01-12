# How to Review Design Tokens v2

## Quick Review Methods

### Method 1: Visual Code Review

Open the token files directly and review the color values:

1. **Token Structure**: `packages/tokens/src/tokens.v2.ts`
   - Review the complete interface (~200 tokens)
   - Check naming makes sense
   - Verify all states are covered

2. **Light Theme**: `packages/tokens/src/themes/light.v2.ts`
   - Review all color values
   - Check contrast and readability
   - Verify clip colors (54 pre-computed colors)

3. **Dark Theme**: `packages/tokens/src/themes/dark.v2.ts`
   - Review all color values
   - Compare to light theme
   - Verify semantic consistency

### Method 2: Interactive Preview Page

We've created a visual preview page where you can see all tokens with color swatches and switch between light/dark themes.

**To access:**
1. The sandbox dev server should be running (check terminal)
2. Add TokenReview component to App.tsx routing
3. Navigate to http://localhost:5173/tokens

### Method 3: Figma Variables Export

Export tokens to Figma to see them in your design environment:

1. Use a Figma plugin like "Token Studio" or "Style Dictionary"
2. Import the JSON token structure
3. Review colors directly in Figma

### Method 4: Print Review Sheet

Create a printable reference sheet:

```bash
cd packages/tokens
# TODO: Add script to generate HTML review sheet
```

## What to Review

### 1. Token Naming ✅
- [ ] Names are semantic (describe purpose, not appearance)
- [ ] Naming is consistent across categories
- [ ] Easy to understand what each token is for
- [ ] No abbreviations or unclear names

### 2. Color Values 🎨
- [ ] Light theme looks good (default for Audacity 4)
- [ ] Dark theme looks good (optional mode)
- [ ] Sufficient contrast for text colors (WCAG AA)
- [ ] Clip colors are distinct and vibrant
- [ ] Semantic colors (success/warning/error) are appropriate

### 3. State Coverage 📋
- [ ] All interactive elements have complete states (idle/hover/active/disabled)
- [ ] Button states make sense
- [ ] Input states are complete
- [ ] Checkbox/radio/toggle states work
- [ ] Slider/fader states are defined

### 4. Audio-Specific 🎵
- [ ] 54 clip colors are pre-computed (9 colors × 6 states)
- [ ] Clip colors work on dark canvas
- [ ] Waveform colors have good contrast
- [ ] Envelope colors are visible
- [ ] Timeline/playhead colors stand out

### 5. Performance ⚡
- [ ] All colors are solid values (no rgba overlays for performance-critical areas)
- [ ] Clip colors are pre-computed
- [ ] No runtime color calculations needed

### 6. Theme Support 🎨
- [ ] Light and dark themes are complete
- [ ] Helper functions make custom themes easy
- [ ] TypeScript ensures all tokens are defined

## Review Checklist

Print this and check off as you review:

**Structure & Organization**
- [ ] Token taxonomy makes sense
- [ ] Organized by domain (background, foreground, border, audio, etc.)
- [ ] Hierarchical naming is clear

**Light Theme**
- [ ] Surface colors work for UI chrome
- [ ] Canvas stays dark for audio work
- [ ] Text has good contrast
- [ ] Borders are visible but not distracting
- [ ] Clip colors are vibrant and distinct
- [ ] Semantic colors are appropriate

**Dark Theme**
- [ ] All surfaces are appropriately dark
- [ ] Canvas is darker than light theme
- [ ] Text is readable
- [ ] Borders work on dark backgrounds
- [ ] Clip colors still pop
- [ ] Semantic colors are bright enough

**Accessibility**
- [ ] Text contrast meets WCAG AA (4.5:1 for body text)
- [ ] Focus states are clearly visible
- [ ] Error states are distinguishable
- [ ] Success/warning/info colors work for colorblind users

**Developer Experience**
- [ ] Token names are self-documenting
- [ ] TypeScript types are complete
- [ ] Helper functions are useful
- [ ] Migration path is clear

**Design System**
- [ ] Scales for future needs
- [ ] Supports custom themes
- [ ] Maintainable long-term
- [ ] Documented well

## Questions to Ask

1. **Are there any tokens missing that Audacity 4 will need?**
2. **Are any tokens redundant or unnecessary?**
3. **Do the color values match the brand/vision for Audacity 4?**
4. **Are the clip colors distinct enough from each other?**
5. **Does the dark theme feel cohesive?**
6. **Are the semantic colors (success/warning/error/info) appropriate?**
7. **Do the helper functions make custom theme creation easy enough?**
8. **Is the migration path from the current system clear?**

## Next Steps After Review

1. **Feedback** - Provide feedback on what needs to change
2. **Iteration** - Adjust colors/names based on feedback
3. **Figma Sync** - Export to Figma variables
4. **Component Migration** - Update components to use new tokens
5. **Testing** - Test in real UI
6. **Documentation** - Finalize docs
7. **Release** - Merge and publish

## Contact

For questions or feedback, comment on the PR or reach out to the design system team.
