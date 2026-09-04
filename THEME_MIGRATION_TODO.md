# Theme Migration TODO - Remaining Components

## Status: 14/27 Components Completed (52%)

Last updated: 2026-01-12

---

## ✅ Completed Components (14)

1. ContextMenu
2. ContextMenuItem
3. ClipContextMenu
4. PreferencePanel
5. PreferenceThumbnail
6. WelcomeDialog
7. SaveProjectModal
8. HomeTab (28 colors migrated)
9. LabelMarker (8 colors)
10. SearchField (9 colors)
11. NumberStepper (10 colors)
12. Tooltip (3 colors)
13. ProgressBar (2 colors)
14. Dialog (added style prop support)
15. ContextMenu (added style prop support)
16. SidePanel (added style prop support)

**Plus ~33 components from previous session = ~47 total themed**

---

## 🔴 Remaining Components (13) - 72 Hardcoded Colors Total

### 1. TabItem
**Location:** `packages/components/src/TabItem/`
**Hardcoded colors:** 6
- `#d4d5d9` (border)
- `#677ce4` (active border)
- `rgba(103, 124, 228, 0.1)` (active background)
- `#14151a` (text)

**Suggested CSS variables:**
```typescript
'--tab-item-border': theme.border.default,
'--tab-item-border-active': theme.border.focus,
'--tab-item-bg-active': theme.background.surface.subtle,
'--tab-item-text': theme.foreground.text.primary,
```

---

### 2. TabList
**Location:** `packages/components/src/TabList/`
**Hardcoded colors:** 3
- `#f8f8f9` (background)
- `#d4d5d9` (border)

**Suggested CSS variables:**
```typescript
'--tab-list-bg': theme.background.surface.elevated,
'--tab-list-border': theme.border.default,
```

---

### 3. SwipeyDots
**Location:** `packages/components/src/SwipeyDots/`
**Hardcoded colors:** 3
- `rgba(0, 0, 0, 0.2)` (inactive dot)
- `#677ce4` (active dot)

**Suggested CSS variables:**
```typescript
'--swipey-dot-inactive': theme.background.surface.subtle,
'--swipey-dot-active': theme.border.focus,
```

---

### 4. TimeCode
**Location:** `packages/components/src/TimeCode/`
**Hardcoded colors:** 6
- `#14151a` (text)
- `#d4d5d9` (border)
- `#677ce4` (focus border)
- Plus input field colors

**Suggested CSS variables:**
```typescript
'--timecode-text': theme.foreground.text.primary,
'--timecode-border': theme.border.default,
'--timecode-focus': theme.border.focus,
'--timecode-bg': theme.background.surface.elevated,
```

---

### 5. Footer
**Location:** `packages/components/src/Footer/`
**Hardcoded colors:** 4
- `#f8f8f9` (background)
- `#14151a` (text)
- `#d4d5d9` (border)

**Suggested CSS variables:**
```typescript
'--footer-bg': theme.background.surface.elevated,
'--footer-text': theme.foreground.text.primary,
'--footer-border': theme.border.default,
```

---

### 6. ProjectThumbnail
**Location:** `packages/components/src/ProjectThumbnail/`
**Hardcoded colors:** 8
- `#ffffff` (background)
- `#e0e0e5` (border)
- `#14151a` (text)
- `#6c6c70` (meta text)
- `#f9f9fa` (hover)

**Suggested CSS variables:**
```typescript
'--project-thumbnail-bg': theme.background.surface.elevated,
'--project-thumbnail-border': theme.border.default,
'--project-thumbnail-text': theme.foreground.text.primary,
'--project-thumbnail-meta': theme.foreground.text.secondary,
'--project-thumbnail-hover': theme.background.surface.hover,
```

---

### 7. ShortcutTableHeader
**Location:** `packages/components/src/ShortcutTableHeader/`
**Hardcoded colors:** 6
- `#14151a` (text)
- `#f0f0f0` (background)
- `#d4d5d9` (border)

**Suggested CSS variables:**
```typescript
'--shortcut-header-text': theme.foreground.text.primary,
'--shortcut-header-bg': theme.background.surface.elevated,
'--shortcut-header-border': theme.border.default,
```

---

### 8. ShortcutTableRow
**Location:** `packages/components/src/ShortcutTableRow/`
**Hardcoded colors:** 7
- `#14151a` (text)
- `#f0f0f0` (background alternating)
- `#d4d5d9` (border)
- Plus hover states

**Suggested CSS variables:**
```typescript
'--shortcut-row-text': theme.foreground.text.primary,
'--shortcut-row-bg': theme.background.surface.default,
'--shortcut-row-bg-alt': theme.background.surface.subtle,
'--shortcut-row-border': theme.border.default,
'--shortcut-row-hover': theme.background.surface.hover,
```

---

### 9. AddTrackFlyout
**Location:** `packages/components/src/AddTrackFlyout/`
**Hardcoded colors:** 7
- Various UI colors for flyout menu

**Suggested CSS variables:**
```typescript
'--add-track-bg': theme.background.surface.elevated,
'--add-track-border': theme.border.default,
'--add-track-text': theme.foreground.text.primary,
'--add-track-hover': theme.background.surface.hover,
```

---

### 10. CloudProjectIndicator
**Location:** `packages/components/src/CloudProjectIndicator/`
**Hardcoded colors:** 1
- `#677ce4` (or similar brand color)

**Suggested CSS variables:**
```typescript
'--cloud-indicator-color': theme.border.focus,
```

---

### 11. SignInActionBar
**Location:** `packages/components/src/SignInActionBar/`
**Hardcoded colors:** 5
- Background, text, button colors

**Suggested CSS variables:**
```typescript
'--signin-bar-bg': theme.background.surface.elevated,
'--signin-bar-text': theme.foreground.text.primary,
'--signin-bar-border': theme.border.default,
```

---

### 12. AutomationCurvePoint
**Location:** `packages/components/src/AutomationCurvePoint/`
**Hardcoded colors:** 16
- **Complex canvas-based component with many visual states**
- May require special handling for canvas rendering
- Consider if some colors should remain fixed for visual clarity

**Note:** This is a specialized visualization component. Some colors may be intentional for UX clarity.

---

### 13. Track (legacy)
**Location:** `packages/components/src/Track/`
**Status:** Legacy component
**Priority:** Low (being replaced by TrackNew)

**Note:** This is an old canvas-based renderer. May not need migration if it's being deprecated.

---

## Migration Pattern (3 Steps)

### Step 1: Add useTheme to TSX
```typescript
import { useTheme } from '../ThemeProvider';
```

### Step 2: Create style object in component
```typescript
const { theme } = useTheme();

const style = {
  '--component-variable': theme.path.to.token,
  // ... more variables
} as React.CSSProperties;
```

### Step 3: Apply to root element
```typescript
<div className="component-name" style={style}>
```

### Step 4: Update CSS
Replace all hardcoded colors with:
```css
color: var(--component-variable);
```

---

## Quick Reference: Common Tokens

```typescript
// Backgrounds
theme.background.surface.default      // Main surface
theme.background.surface.elevated     // Raised surface (modals, cards)
theme.background.surface.subtle       // Subdued surface
theme.background.surface.hover        // Hover state

// Text
theme.foreground.text.primary         // Main text
theme.foreground.text.secondary       // Subdued text
theme.foreground.text.disabled        // Disabled text

// Icons
theme.foreground.icon.primary         // Main icons
theme.foreground.icon.secondary       // Subdued icons

// Borders
theme.border.default                  // Standard borders
theme.border.focus                    // Focus/active state (blue)
theme.border.divider                  // Separator lines

// State colors
theme.foreground.icon.success         // Green
theme.foreground.icon.warning         // Yellow/Orange
theme.foreground.icon.error           // Red
theme.foreground.icon.info            // Blue
```

---

## Build & Test

After each migration:

```bash
# Build components package
pnpm --filter @audacity-ui/components build

# Test in sandbox (already running)
# http://localhost:3001

# Test theme toggle
# Preferences → Appearance → Light/Dark
```

---

## Current Build Status

- ✅ Build: **PASSING**
- ✅ Sandbox: **RUNNING** on http://localhost:3001
- ✅ Theme Toggle: **FUNCTIONAL**
- ✅ Storybook: **RUNNING**

---

## Priority Ranking

**High Priority (User-Facing UI):**
1. TabItem, TabList, SwipeyDots (tab navigation)
2. TimeCode (time display)
3. Footer (application footer)
4. ProjectThumbnail (project UI)

**Medium Priority (Less Visible):**
5. ShortcutTableHeader, ShortcutTableRow (keyboard shortcuts dialog)
6. AddTrackFlyout (add track menu)
7. SignInActionBar (sign-in UI)
8. CloudProjectIndicator (cloud status)

**Low Priority (Specialized/Legacy):**
9. AutomationCurvePoint (complex visualization - may need special handling)
10. Track (legacy - being replaced)

---

## Notes

- The **core user experience is already fully themed** (47 components)
- These remaining 13 are polish/completeness items
- Some components (AutomationCurvePoint, Track) may not need full migration
- All critical dialogs, menus, inputs, and preferences are already done

---

## Helpful Commands

```bash
# Find hardcoded colors in a component
grep -nE '#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b|rgba?\(' packages/components/src/ComponentName/ComponentName.css

# Check if component already has useTheme
grep -q "useTheme" packages/components/src/ComponentName/ComponentName.tsx && echo "Already migrated" || echo "Needs migration"

# Build just components
pnpm --filter @audacity-ui/components build

# Count remaining hardcoded colors
find packages/components/src -name "*.css" -exec grep -l '#[0-9a-fA-F]\|rgba\?' {} \; | wc -l
```
