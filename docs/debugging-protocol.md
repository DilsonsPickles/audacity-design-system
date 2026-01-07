# Debugging Protocol

This document establishes mandatory steps when debugging to avoid wasting time.

## Golden Rules

1. **Search first, fix second** - Never assume where code lives
2. **If it doesn't work after 2 attempts, SEARCH** - Don't keep trying variations
3. **Listen to user feedback literally** - "It's still working" = your fix didn't work, code exists elsewhere
4. **Use the Task tool for multi-step debugging** - Don't try to solve complex searches manually

## When a Fix Doesn't Work

If you make a change and the user reports it still doesn't work:

### Step 1: STOP and Search (Mandatory)
```bash
# Search for all instances of the pattern
grep -r "pattern" apps/ packages/

# For keyboard shortcuts specifically
grep -r "onKeyDown\|handleKeyDown" apps/ packages/

# For specific keys
grep -r "ArrowLeft\|ArrowRight\|Delete" apps/ packages/
```

### Step 2: Check Documentation
- Read `docs/keyboard-handlers-map.md` for keyboard shortcuts
- Read `docs/component-architecture.md` for component locations
- Check CLAUDE.md for architectural patterns

### Step 3: Only Then Make Changes
- Verify you found ALL instances of the code
- Make changes in the correct location
- If code exists in multiple places, update ALL of them

## Common Mistakes to Avoid

### ❌ DON'T: Keep working in the same file
If a fix doesn't work, the code likely exists elsewhere. Don't try 5 different variations in the same file.

### ✅ DO: Search the entire codebase
Use grep/Grep tool to find ALL instances of the pattern you're trying to fix.

---

### ❌ DON'T: Assume components package has all logic
Apps (sandbox/demo) can and do override/extend component behavior.

### ✅ DO: Check apps first for app-specific features
Features like label keyboard shortcuts are in apps/sandbox, not packages/components.

---

### ❌ DON'T: Add debug logs without searching first
Debug logs only help if you're in the right file. Search to find the right file first.

### ✅ DO: Use Task tool for complex debugging
The general-purpose agent can systematically search and investigate.

---

### ❌ DON'T: Work for hours in the wrong place
If you've spent 30+ minutes without progress, you're likely in the wrong place.

### ✅ DO: Re-read the user's feedback and search again
The user's feedback is usually telling you exactly what's wrong.

## Keyboard Shortcuts Specific Protocol

When modifying keyboard shortcuts:

1. **Check `docs/keyboard-handlers-map.md` FIRST** - This maps every keyboard handler location
2. **Search for the key pattern** - `grep -r "ArrowLeft" apps/ packages/`
3. **Remember:** Labels are in Canvas.tsx (apps/sandbox), Clips are in TrackNew.tsx (packages/components)
4. **Verify the fix works** - Ask user to test before moving on

## Build/Rebuild Protocol

When changes don't appear:

1. **Kill ALL dev servers** - `lsof -ti:3000 | xargs kill -9`
2. **Rebuild the package** - `cd packages/[package] && pnpm build`
3. **Clear cache** - `rm -rf apps/sandbox/.vite` (for Vite apps)
4. **Restart dev server** - `cd apps/sandbox && pnpm dev`
5. **Hard refresh browser** - Cmd+Shift+R

## Module Architecture Quick Reference

```
packages/
  components/     - Reusable UI components (ClipDisplay, TrackNew, LabelMarker)
                   - Clip keyboard handlers ARE here

apps/
  sandbox/        - Development app consuming packages
                   - Label keyboard handlers ARE here (Canvas.tsx)
                   - App-specific state management

  demo/           - Legacy demo (not using packages yet)
```

**Key Insight:** Just because LabelMarker is a component doesn't mean its keyboard handlers are in the component. App-level features (like label editing) are handled at the app level.

## Accountability Checklist

Before claiming a fix is complete:

- [ ] I searched the codebase for all instances of this pattern
- [ ] I checked the relevant docs/[feature]-map.md file
- [ ] I verified I'm editing the correct file (not assuming based on component name)
- [ ] If it's a keyboard shortcut, I checked docs/keyboard-handlers-map.md
- [ ] I rebuilt the package if I edited packages/*
- [ ] I asked the user to verify it works
