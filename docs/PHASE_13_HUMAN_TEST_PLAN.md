# Phase 13 Human Test Plan: Accessibility & Keyboard UX

## Automated Checks
- AUTOMATED = PASS (Linting, TypeScript check `tsc --noEmit`, Vite build)

---

## Manual Verification Checklist

Please verify the following manually:

### A11Y-001: Focus Visibility
- **STARTING STATE**: On any screen.
- **ACTION**: Press `Tab` repeatedly.
- **EXPECTED RESULT**: The active element receives a clear, distinct purple focus ring (`ring-2 ring-primary`). Mouse clicks do NOT trigger this ring.
- **PASS/FAIL**: [ ]

### A11Y-002 & A11Y-003: Sidebar Escape & Restoration
- **STARTING STATE**: On a mobile viewport width (<768px), sidebar open.
- **ACTION**: Press `Escape`.
- **EXPECTED RESULT**: The sidebar closes. Focus should ideally fall back to the main document context.
- **PASS/FAIL**: [ ]

### A11Y-005 & A11Y-007: Command Palette Cmd/Ctrl+K
- **STARTING STATE**: On the dashboard.
- **ACTION**: Press `Cmd + K` (Mac) or `Ctrl + K` (Windows).
- **EXPECTED RESULT**: The Command Palette opens and auto-focuses the search input.
- **ACTION**: Press `Escape`.
- **EXPECTED RESULT**: The Command Palette closes smoothly.
- **PASS/FAIL**: [ ]

### A11Y-010: Context Panel Keyboard Behavior
- **STARTING STATE**: On the dashboard, with the Activity or Chat panel open via mouse click.
- **ACTION**: Press `Escape`.
- **EXPECTED RESULT**: The context panel closes.
- **PASS/FAIL**: [ ]

### A11Y-013: Notification Keyboard Navigation
- **STARTING STATE**: On the dashboard.
- **ACTION**: Click the Notification Bell icon. Press `Tab` to navigate into the dropdown list.
- **EXPECTED RESULT**: Individual notifications can receive keyboard focus (indicated by a focus ring), and pressing `Enter` triggers their respective click action.
- **PASS/FAIL**: [ ]

### A11Y-019: Reduced Motion
- **STARTING STATE**: OS Accessibility settings.
- **ACTION**: Enable "Reduce Motion" in your OS. Navigate through Nexus menus, dialogs, and panels.
- **EXPECTED RESULT**: Animations and transitions (such as sidebar sliding, hover states) are instantly disabled or resolved.
- **PASS/FAIL**: [ ]
