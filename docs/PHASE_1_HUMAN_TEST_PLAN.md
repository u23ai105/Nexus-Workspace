# Phase 1: Human Test Plan (Design System & Visual Language)

This protocol outlines the exact manual checks required to verify the visual, responsive, and accessibility quality of Phase 1 before proceeding to Phase 2.

## A. Workspace Dashboard (Visual Quality)
**TEST: VIS-001**
- **SCREEN:** Workspace Dashboard
- **VIEWPORT:** 1440px (Desktop)
- **STARTING STATE:** Logged into an active workspace.
- **EXACT ACTIONS:**
  1. Open the main workspace dashboard.
  2. Inspect the overall color palette.
  3. Inspect the spacing between sidebar, header, and main content area.
- **EXPECTED RESULT:**
  - Neutral-first dark palette (no bright orange/purple backgrounds).
  - Consistent gaps and padding using the new design tokens.
- **WHAT TO LOOK FOR:**
  - Bright legacy styles or gradients.
  - Inconsistent or missing borders.
- **PASS/FAIL:** [ ]

## B. Documents View
**TEST: VIS-002**
- **SCREEN:** Documents Grid / List
- **VIEWPORT:** 1440px (Desktop)
- **STARTING STATE:** Viewing the "All Documents" tab.
- **EXACT ACTIONS:**
  1. Look at the document cards.
  2. Hover over a document card.
- **EXPECTED RESULT:**
  - Cards use the standard Shadcn `<Card>` primitive.
  - Hover state is subtle (e.g., slight background color change, not an intense shadow).
- **WHAT TO LOOK FOR:**
  - Overly large cards.
  - Excessive shadows.
  - Inconsistent border radius.
- **PASS/FAIL:** [ ]

## C. Folder View
**TEST: VIS-003**
- **SCREEN:** Folder Cards
- **VIEWPORT:** 1440px (Desktop)
- **STARTING STATE:** Viewing the "Folders" section or a specific folder.
- **EXACT ACTIONS:**
  1. Look at the folder cards.
  2. Ensure they visually align with the document cards.
- **EXPECTED RESULT:**
  - Unified design language between folders and documents.
- **WHAT TO LOOK FOR:**
  - Typography mismatches.
- **PASS/FAIL:** [ ]

## D. Manage Team Dialog
**TEST: VIS-004**
- **SCREEN:** Manage Team Modal
- **VIEWPORT:** 1440px (Desktop)
- **STARTING STATE:** Click "Manage Team" from the dashboard sidebar.
- **EXACT ACTIONS:**
  1. Open the modal.
  2. Look at the overlay backdrop and modal container.
- **EXPECTED RESULT:**
  - Modal has a blurred or darkened backdrop.
  - Clear visual hierarchy inside the modal.
- **WHAT TO LOOK FOR:**
  - The old custom fixed-position `div` overlay (it should now be a standard Dialog).
- **PASS/FAIL:** [ ]

## E. Buttons and Tooltips
**TEST: VIS-005**
- **SCREEN:** Any screen with primary actions
- **VIEWPORT:** 1440px (Desktop)
- **STARTING STATE:** Look at header and sidebar buttons.
- **EXACT ACTIONS:**
  1. Hover over icon-only buttons.
  2. Check the tooltip styling.
- **EXPECTED RESULT:**
  - Buttons use Shadcn standard styles.
  - Tooltips appear with dark theme consistency.
- **WHAT TO LOOK FOR:**
  - Duplicate button implementations.
  - Inconsistent icon sizing (should mostly be `w-4 h-4`).
- **PASS/FAIL:** [ ]

## F. Dropdown Menus
**TEST: VIS-006**
- **SCREEN:** Document / Folder Context Menus
- **VIEWPORT:** 1440px (Desktop)
- **STARTING STATE:** Click the "..." menu on a document card.
- **EXACT ACTIONS:**
  1. Open the dropdown menu.
- **EXPECTED RESULT:**
  - Menu aligns correctly relative to the trigger.
  - Menu items have consistent padding and hover states.
- **WHAT TO LOOK FOR:**
  - The old custom state-machine `div` dropdowns (should now use Radix DropdownMenu).
- **PASS/FAIL:** [ ]

---

## G. Fluid Responsive Layout Tests

**TEST: RES-001 (Continuous Fluid Resize)**
- **ACTIONS:** Manually resize the browser continuously from ~375px up to 1920px and back down.
- **EXPECTED RESULT:**
  - The UI must remain usable at **arbitrary intermediate widths**.
  - **Grid:** Scales columns smoothly without creating dead space or clipping cards.
  - **Sidebar:** Transitions elegantly from inline to a hidden drawer overlay below ~768px.
  - **Panels (Chat/AI):** Drops from 2 side-by-side (expanded), to 1 side-by-side (constrained), to full-screen overlays on small screens. Panels should never crush the main content area into an unusable sliver.
  - **Editor:** The editor content area `w-[min(calc(100%_-_2rem),48rem)]` must remain centered and naturally shrink on small screens without overflowing horizontally.
  - **Modals:** Dialogs gracefully shrink and maintain a 1rem margin on mobile devices without bleeding off-screen.
- **WHAT TO LOOK FOR:**
  - Accidental horizontal scrolling.
  - Unexpected component overlap or text collision.
  - UI clipping or unusable squished content.
  - Strange layout jumps between fixed breakpoints.
- **PASS/FAIL:** [ ]

---

## H. Accessibility (A11y) Tests

**TEST: ACC-001 (Keyboard Navigation)**
- **STARTING STATE:** Reload Dashboard.
- **EXACT ACTIONS:**
  1. Do not use the mouse.
  2. Press `Tab` repeatedly to navigate through the dashboard.
  3. Navigate to a document's "..." menu and press `Enter` or `Space` to open it.
  4. Use arrow keys to navigate the dropdown menu.
- **EXPECTED RESULT:**
  - Focus is always visible (e.g., standard `focus:ring-1`).
  - Dropdown can be opened and navigated entirely via keyboard.
- **WHAT TO LOOK FOR:**
  - Focus escaping or disappearing entirely.
- **PASS/FAIL:** [ ]

**TEST: ACC-002 (Dialog Accessibility)**
- **STARTING STATE:** Dashboard, focused on "Manage Team" button.
- **EXACT ACTIONS:**
  1. Press `Enter` to open the dialog.
  2. Press `Tab` through the controls inside the dialog.
  3. Press `Escape`.
- **EXPECTED RESULT:**
  - Focus is trapped inside the dialog while open.
  - `Escape` successfully closes the dialog and returns focus to the trigger button.
- **WHAT TO LOOK FOR:**
  - Focus escaping to background elements behind the modal.
- **PASS/FAIL:** [ ]

**TEST: ACC-003 (Icon-Only Buttons)**
- **STARTING STATE:** Dashboard.
- **EXACT ACTIONS:**
  1. Inspect icon-only buttons (like the Trash icon or Settings icon) using browser DevTools or a screen reader.
- **EXPECTED RESULT:**
  - Buttons have `aria-label` or visually hidden text for screen readers.
- **PASS/FAIL:** [ ]
