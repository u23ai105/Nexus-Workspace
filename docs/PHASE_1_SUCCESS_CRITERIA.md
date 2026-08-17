# Phase 1 Success Criteria

Phase 1 focuses exclusively on establishing the Design System and Visual Language for Nexus Workspace. The architecture must remain untouched unless strictly necessary for UI primitives. 

Phase 1 is complete ONLY when the following measurable goals are met:

## Design Token Consistency
- [ ] Centralized CSS variables for colors, typography, spacing, radius, borders, shadows, and z-index exist in `index.css`.
- [ ] No arbitrary or one-off HEX/RGB/HSL values are used in component classes (e.g., `bg-[#121212]`).
- [ ] The color palette is strictly neutral-first (graphite/black backgrounds, subtle elevated surfaces) with limited semantic accents (blue/indigo primary, green success, amber warning, red danger, violet AI).

## Typography Hierarchy
- [ ] A clear, compact, and professional typographic scale is implemented using the Geist font.
- [ ] Font sizes and weights are consistent across page titles, section titles, body text, metadata, labels, and buttons.

## UI Primitive Reusability
- [ ] Core primitives (`Button`, `Card`, `Input`, `Dialog/Modal`, `Tooltip`, `Badge`, `Sidebar/Panel`) are consolidated in `apps/web/src/components/ui`.
- [ ] No duplicated implementations of the same primitive exist (e.g., three different custom buttons).
- [ ] Shadcn components are preserved, customized to match the new dark-first aesthetic, and reused.

## Visual Quality (The "Linear/Notion" Bar)
- [ ] No arbitrary bright borders, huge rounded cards, heavy drop shadows, neon colors, or excessive glassmorphism remain.
- [ ] Hover and focus states are subtle, intentional, and consistent across all interactive elements.
- [ ] Disabled and loading states are visually distinct and consistent.
- [ ] Icon sizing and stroke widths are uniform across the app.

## Accessibility
- [ ] Focus indicators are clearly visible and accessible for keyboard navigation.
- [ ] Contrast ratios meet minimum accessibility standards, even for muted secondary text.

## Regression & Verification
- [ ] The codebase passes `pnpm run lint` and `pnpm run build` without new errors.
- [ ] Visual regression audit passes for at least: Workspace Dashboard, Documents view, Trash view, one Modal, and one Side Panel.
- [ ] Responsive audit passes across 1440p, laptop, tablet, and mobile views.
- [ ] No P0 issues exist. No newly introduced P1 issues exist.
