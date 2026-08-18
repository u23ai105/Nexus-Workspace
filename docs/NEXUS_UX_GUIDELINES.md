# Nexus UX & Design Guidelines

## 1. Core Principles
- **Clarity over Density:** Ensure generous whitespace (`gap-4`, `p-6`) to let content breathe.
- **Contextual Actions:** Tools should only appear when relevant (e.g., hover states on document cards, formatting toolbars appearing on selection).
- **Immediate Feedback:** All user actions (clicks, saves, errors) must result in immediate visual feedback (optimistic UI, toast notifications, loading spinners).

## 2. Design Tokens (Tailwind)
- **Primary Color:** Deep Blue / Indigo (`bg-primary`, `text-primary`). Used for main actions (Save, Create).
- **Backgrounds:** `bg-background` for the main canvas, `bg-card` for floating elements and sidebars, `bg-muted` for secondary active states.
- **Typography:** `font-sans` (Inter/Geist) for UI elements, `font-serif` available inside the rich text editor.
- **Radius:** Standardized to `rounded-md` for buttons/inputs, `rounded-lg` for dialogs and cards.

## 3. Component Guidelines
### Buttons
- **Primary:** Solid background (`bg-primary text-primary-foreground`). Use sparingly for the main action on a screen.
- **Secondary:** Outline or subtle (`variant="outline"`, `variant="ghost"`). Use for cancellations or secondary actions.
- **Destructive:** Red tone (`variant="destructive"`). Always prompt for confirmation on destructive actions (e.g., deleting a workspace).

### Context Panels (Right Sidebar)
- Used for Global Chat, Tasks, Notifications, and AI.
- Must overlay or squeeze the main content gracefully using CSS Grid.
- **Only one context panel** may be open at a time to prevent UI clutter.

### Empty States
- Always provide an illustration (Lucide icon) and a clear Call to Action (e.g., "Create your first document"). Never leave a screen blank.

## 4. Accessibility (A11Y)
- **Focus Rings:** All interactive elements MUST use the global focus ring utility (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`) defined in `index.css`.
- **Keyboard Navigation:** The Command Palette (`Cmd+K`), Escape key (to close panels), and Tab navigation must be fully supported.
- **Reduced Motion:** Respect OS-level `prefers-reduced-motion`. Disable slide-in animations when true.

## 5. Responsive Behavior
- **Mobile (< 768px):** Sidebars convert to bottom sheets or hamburger menus. Context panels overlay the screen entirely.
- **Desktop (> 768px):** Sidebars are persistent or collapsible via a toggle.

## 6. Collaboration UI
- **Avatars:** Displayed in the top right (`OnlineBar`). Hovering an avatar shows the user's name.
- **Cursors:** Each user gets a deterministic, persistent color derived from their `userId`. Cursors must clearly display the user's name on movement.
