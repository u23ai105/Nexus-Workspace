# Nexus Accessibility Guidelines

This document outlines the strict accessibility standards introduced in Phase 13 and serves as the permanent reference for all future phases.

## 1. Focus System
- **Focus Rings**: We rely on `:focus-visible` globally. We do not use `outline-none` on `*` without a fallback. Instead, the global focus ring is defined in `index.css`:
  ```css
  *:focus-visible {
    @apply outline-none ring-2 ring-primary ring-offset-2 ring-offset-background;
  }
  ```
- **Mouse vs Keyboard**: By using `:focus-visible` instead of `:focus`, users interacting via mouse do not see distracting rings around buttons, while keyboard users receive clear visual feedback.

## 2. ARIA & Icon-only Buttons
- **`aria-label` Requirement**: Any button or interactive element that relies entirely on an icon MUST have an explicit `aria-label` describing the action (e.g., `aria-label="Close panel"`).
- **Redundancy**: Do not add `aria-label` to buttons that already contain descriptive visible text, as screen readers will naturally read the text.
- **States**: Expandable areas must toggle `aria-expanded={true/false}` on their triggers. We use this on the Sidebar toggle and Notification Bell.

## 3. Drawers, Modals & Dialogs
- **Escape Key Handling**: All non-trivial overlay surfaces (Context Panels, Mobile Sidebars) must close when the user presses `Escape`.
- **Focus Trapping**: Full-screen dialogs and modal drawers must trap focus to prevent keyboard users from wandering into the inert background content. We lean on Radix primitives where possible to handle this automatically.

## 4. Reduced Motion
- Nexus respects the OS-level "reduced motion" preference. `index.css` applies a global override when `prefers-reduced-motion: reduce` is detected, zeroing out CSS transition and animation durations. Do not circumvent this in component-specific styles unless motion is mission-critical.

## 5. Keyboard UX (Shortcuts)
- `Cmd/Ctrl+K` globally triggers the Command Palette.
- `Escape` handles contextual dismissals globally (Command Palette -> Active Dialog -> Active Panel -> Active Mobile Sidebar).
- Always use semantic `<button>` or `<a>` elements so that `Enter` and `Space` work natively. **Avoid `onClick` on generic `<div>` elements**.

## 6. Contrast & Color
- Adhere to WCAG AA minimums. Ensure muted text against dark backgrounds (`text-muted-foreground` against `bg-card` or `bg-background`) remains legible.
- When indicating system states (like "Unread Notifications"), do not rely solely on color. Include text, borders, or numeric counts.
