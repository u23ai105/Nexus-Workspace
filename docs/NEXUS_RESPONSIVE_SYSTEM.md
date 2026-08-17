# Nexus Fluid Responsive System

## 1. Core Principles

Nexus abandons traditional "device-specific" breakpoints (sm, md, lg) for primary layout architecture in favor of a universal fluid system.

- **Container-First:** Reusable components (panels, cards, grids) determine their layout based on the width of their container, not the viewport.
- **Intrinsic Sizing:** Elements declare constraints (`min()`, `max()`, `clamp()`) and adapt to the available space naturally.
- **Overlap Prevention:** We rely on flex wrapping, fluid widths, and min/max logic rather than arbitrary breakpoints to avoid overlapping content.
- **Horizontal Overflow:** `overflow-x: hidden` is never used to patch buggy layouts. True fluid layouts do not produce horizontal overflow.

## 2. Why `windowWidth` State Was Removed

Historically, we checked `window.innerWidth` in React state to toggle mobile backdrops, sidebar visibility, and panel limits.

**Problems with JS Viewport Checks:**
1. Components don't care about the viewport; they care about their available space.
2. It forced a re-render cascade on resize.
3. It duplicated layout logic that CSS is built to handle intrinsically.

**The Solution:**
We removed global `windowWidth` state. We use CSS for layout (Grid auto-fit, `@media`, flex-wrap) and only use a targeted `useContainerSize` (ResizeObserver) when React *must* conditionally unmount/mount functional blocks based on available container width (e.g., dynamically reducing the active panel count from 2 to 1).

## 3. Shell Layout & Sidebar Behavior

- **Global Shell:** A rigid but fluid outer shell that defines the primary application space.
- **Sidebar:** Transitions organically. Uses media queries (`md:` / max 768px) *only* to enforce a global information architecture shift (inline sidebar -> hidden drawer). Above 768px, it participates naturally in the flex/grid layout.

## 4. Container Queries & Panel Strategy

Contextual side panels (Team Chat, AI, Action Items) rely on container width rather than viewport width.

**Hierarchy of Space (`useContainerSize`):**
- `EXPANDED (>= 1200px container)`: Up to 2 panels can coexist alongside the main content.
- `CONSTRAINED (>= 800px container)`: The system enforces a maximum of 1 inline panel.
- `VERY CONSTRAINED (< 800px container)`: Panels convert to full-height overlays (`w-[min(400px,90vw)]`) to prevent the primary workspace document from being squeezed into an unusable column.
- `MOBILE (< 500px container)`: Panels become full-screen overlays (`w-screen`).

*Note: We apply ResizeObserver (`useContainerSize`) on the `.flex-1` main workspace container so panels respond strictly to their shared living area.*

## 5. Grid Strategy (Documents & Folders)

No `sm:grid-cols-2 md:grid-cols-3` hacks.

```css
grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
```
- Fits as many 260px columns as possible.
- If the container shrinks below 260px, it naturally scales down to 100% (1 column).

## 6. Modal Strategy (Dialogs)

No hardcoded `sm:max-w-md` breakpoints.

```css
width: min(calc(100vw - 2rem), var(--dialog-max-width, 720px));
```
- A modal always respects a 1rem safe margin on both sides.
- It maxes out at an intrinsic max width (e.g., 720px) when space permits.

## 7. Editor & Typography

**Editor Width:**
Uses intrinsic bounds: `w-[min(calc(100%_-_2rem),48rem)]`. The editor never forces a minimum width that causes horizontal overflow on tiny screens.

**Typography & Spacing:**
- `clamp()` is preferred for hero titles and large headings.
- Standard Tailwind spacing tokens are kept to a minimum without aggressive breakpoint overrides (e.g. `p-4 sm:p-8`).

## 8. Where Traditional Media Queries Remain

We only use `@media` queries (`md:`, `lg:`) when the **Information Architecture** fundamentally changes:
- Hiding a global sidebar to create a drawer.
- Changing a global horizontal nav into a hamburger menu.

We *do not* use media queries for sizing cards, deciding how many columns a grid has, or setting hard max-widths on modals.

## 9. Known Limitations
- Container Queries (`@container`) are supported in modern browsers, but complex sub-grid interactions inside `@container` layouts can occasionally require fallback Flexbox wraps.
- `ResizeObserver` can cause a 1-frame layout shift on initial mount before width is computed. We default to a safe assumed layout (1 panel max) until the observer fires.
