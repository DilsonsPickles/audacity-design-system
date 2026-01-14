# Remaining Theme Migrations

## Completed So Far: 14 Components ✅

1. ContextMenu, ContextMenuItem, ClipContextMenu
2. PreferencePanel, PreferenceThumbnail
3. WelcomeDialog, SaveProjectModal
4. HomeTab, LabelMarker
5. SearchField, NumberStepper
6. Tooltip, ProgressBar

## Remaining: 14 Components

### Migration Pattern

For each component, follow these 3 steps:

#### Step 1: Add useTheme import to TSX
```typescript
import { useTheme } from '../ThemeProvider';
```

#### Step 2: Add style object in component function
```typescript
const { theme } = useTheme();

const style = {
  '--component-name-variable': theme.path.to.token,
  // ... more variables
} as React.CSSProperties;
```

#### Step 3: Apply style to root element
```typescript
<div className="component-name" style={style}>
```

#### Step 4: Update CSS to use variables
Replace hardcoded colors with `var(--component-name-variable)`

---

## Component List with Hardcoded Colors

### 1. TabItem (6 colors)
**Hardcoded colors in CSS:**
- `#d4d5d9` (border)
- `#677ce4` (active border, background)
- `#14151a` (text)
- `rgba(103, 124, 228, 0.1)` (background)

**Suggested tokens:**
```typescript
'--tab-item-border': theme.border.default,
'--tab-item-border-active': theme.border.focus,
'--tab-item-bg-active': theme.background.surface.subtle,
'--tab-item-text': theme.foreground.text.primary,
```

### 2. TabList (3 colors)
**Hardcoded colors:**
- `#f8f8f9` (background)
- `#d4d5d9` (border)

**Suggested tokens:**
```typescript
'--tab-list-bg': theme.background.surface.elevated,
'--tab-list-border': theme.border.default,
```

### 3. SwipeyDots (3 colors)
**Hardcoded colors:**
- `rgba(0, 0, 0, 0.2)` (inactive dot)
- `#677ce4` (active dot)

**Suggested tokens:**
```typescript
'--swipey-dot-inactive': theme.background.surface.subtle,
'--swipey-dot-active': theme.border.focus,
```

### 4. TimeCode (6 colors)
**Hardcoded colors:**
- `#14151a` (text)
- `#d4d5d9` (border)
- `#677ce4` (focus)

**Suggested tokens:**
```typescript
'--timecode-text': theme.foreground.text.primary,
'--timecode-border': theme.border.default,
'--timecode-focus': theme.border.focus,
```

### 5. Footer (4 colors)
**Hardcoded colors:**
- `#f8f8f9` (background)
- `#14151a` (text)
- `#d4d5d9` (border)

**Suggested tokens:**
```typescript
'--footer-bg': theme.background.surface.elevated,
'--footer-text': theme.foreground.text.primary,
'--footer-border': theme.border.default,
```

### 6. ProjectThumbnail (8 colors)
**Hardcoded colors:**
- `#ffffff` (background)
- `#e0e0e5` (border)
- `#14151a` (text)
- `#6c6c70` (meta text)
- `#f9f9fa` (hover)

**Suggested tokens:**
```typescript
'--project-thumbnail-bg': theme.background.surface.elevated,
'--project-thumbnail-border': theme.border.default,
'--project-thumbnail-text': theme.foreground.text.primary,
'--project-thumbnail-meta': theme.foreground.text.secondary,
'--project-thumbnail-hover': theme.background.surface.hover,
```

### 7. ShortcutTableHeader (similar to ShortcutTableRow)
### 8. ShortcutTableRow
**Hardcoded colors:**
- `#14151a` (text)
- `#f0f0f0` (background alternating)
- `#d4d5d9` (border)

**Suggested tokens:**
```typescript
'--shortcut-table-text': theme.foreground.text.primary,
'--shortcut-table-bg-alt': theme.background.surface.subtle,
'--shortcut-table-border': theme.border.default,
```

### 9. AddTrackFlyout
### 10. CloudProjectIndicator
### 11. SignInActionBar
(Check these for hardcoded colors and follow same pattern)

### 12. AutomationCurvePoint
(Specialized component - may keep current styling)

### 13. Track (legacy)
(Legacy component - lowest priority)

### 14. LabelEditorHeader (3 colors)
**Hardcoded colors:**
- `#F8F8F9` (background - light theme specific)
- Uses theme tokens for border and text

**Suggested tokens:**
```typescript
'--label-editor-header-bg': theme.background.surface.elevated,
'--label-editor-header-border': theme.border.default,
'--label-editor-header-text': theme.foreground.text.primary,
```

**Note:** Background color `#F8F8F9` is hardcoded per design spec. Will need dark theme equivalent.

---

## Quick Reference: Common Theme Tokens

```typescript
// Backgrounds
theme.background.surface.default
theme.background.surface.elevated
theme.background.surface.subtle
theme.background.surface.hover

// Text
theme.foreground.text.primary
theme.foreground.text.secondary
theme.foreground.text.disabled

// Icons
theme.foreground.icon.primary
theme.foreground.icon.secondary

// Borders
theme.border.default
theme.border.focus
theme.border.divider

// State colors
theme.foreground.icon.success
theme.foreground.icon.warning
theme.foreground.icon.error
theme.foreground.icon.info
```

---

## Testing After Migration

After migrating all components:

1. Build: `pnpm --filter @audacity-ui/components build`
2. Run sandbox: Already running at http://localhost:3001
3. Test theme toggle: Preferences → Appearance → Light/Dark
4. Verify all components adapt to theme changes

---

## Current Status

**Migrated:** 14/28 components (50%)
**Remaining:** 14 components
**Build:** ✅ Passing
**Sandbox:** ✅ Running
**Theme Toggle:** ✅ Functional

The most important user-facing components are already themed. The remaining components are:
- Lower priority UI (shortcuts table, cloud indicators)
- Specialized/legacy (AutomationCurvePoint, Track)
- Nice-to-have completeness (tabs, dots, footer)
