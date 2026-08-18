# Nexus Responsive Audit

## Responsive Architecture
The application uses a mobile-first fluid layout strategy leveraging Tailwind CSS. It eschews excessive breakpoint-specific design (e.g. `sm:`, `md:`, `lg:`) in favor of flexbox, CSS Grid, and intrinsic sizing. Breakpoints are reserved solely for profound structural changes (such as converting the sidebar to a modal drawer on mobile viewports).

## Grid Implementations
- **Document Dashboard**: Employs an intrinsic CSS grid using `grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]`. This prevents arbitrary column count hardcoding (`grid-cols-2`, `grid-cols-3`) and ensures documents gracefully fill the available width while respecting a minimum comfortable size of 260px.

## Component Behaviors
- **Left Sidebar**: 
  - On desktop (`md` and up), it operates as a standard structural sidebar within the layout shell, with horizontal translation for collapse state.
  - On mobile (`max-md`), it converts to a modal drawer that renders above the content, utilizing an `fixed inset-0` background backdrop to prevent background scrolling.
- **Contextual Panel (Right Sidebar)**:
  - Transitioned from JS-based ResizeObserver logic (`containerWidth < 600`) to pure CSS media queries (`max-md:`). On constrained mobile devices, the panel transitions into a full-screen or modal overlay to protect the central editor space from becoming unusably narrow.
- **Header**: Responsive scaling prioritizes primary navigation.
- **Editor**: Uses fluid width constraints (`w-[min(calc(100%_-_2rem),48rem)]`) to maintain ideal reading width (up to 48rem) while adapting safely to narrow screens.

## Touch Targets
- Mobile actions (sidebar toggle, panel close buttons, primary actions, and send actions) have been padded to guarantee a `min-h-[44px] min-w-[44px]` touch area on mobile via `max-md:min-h-[44px] max-md:min-w-[44px]`.
- The rich text formatting toolbar buttons scale from `h-8 w-8` to `h-10 w-10` on mobile. This ensures comfortable tappability without overly exploding the toolbar height.

## Overflow Strategy
- **Horizontal Overflow Control**: No global `overflow-x: hidden` is applied to the DOM root, protecting accessibility and zooming.
- **Toolbar**: Utilizes `overflow-x-auto no-scrollbar` to allow many formatting tools without pushing the page width outwards.

## Tldraw Integration
- `touch-action: none` is natively managed by Tldraw exclusively on the canvas interaction surface, preserving normal browser scrolling on surrounding menus and headers.

## Known Limitations / Remaining Issues
- **Hover States**: Tailwind `hover:` states will trigger on tap for mobile devices. This is standard behavior but can sometimes leave interactive elements in an active state until tapped elsewhere.
- **Safe Area Insets**: Explicit handling for iOS bottom home bars (env safe-areas) is currently left to the browser's default behavior, though padding is sufficient to prevent occlusion.
