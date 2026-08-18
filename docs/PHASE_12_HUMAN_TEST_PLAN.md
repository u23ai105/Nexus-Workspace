# Phase 12 Human Test Plan: Responsive Design & Cross-Device Audit

The primary objective of this test plan is to validate the intrinsic layout architecture and ensure NO horizontal overflow occurs at any viewport size.

## Validation Method
Load the application in a desktop browser and open Developer Tools to enable Responsive Design Mode (or use the resizing handle). Use the exact pixel widths specified below.

> [!IMPORTANT]
> Test by manually dragging the browser continuously between these widths to observe fluid breakpoints in real time. Do not just test the static points.

---

## Static Width Checkpoints

- [ ] **RESP-001**: `375px` (Mobile)
- [ ] **RESP-002**: `390px` (Mobile)
- [ ] **RESP-003**: `430px` (Mobile)
- [ ] **RESP-004**: `512px` (Narrow)
- [ ] **RESP-005**: `600px` (Narrow Tablet)
- [ ] **RESP-006**: `768px` (Tablet)
- [ ] **RESP-007**: `820px` (Tablet)
- [ ] **RESP-008**: `900px` (Constrained Desktop/Tablet)
- [ ] **RESP-009**: `1024px` (Standard Laptop)
- [ ] **RESP-010**: `1280px` (Laptop)
- [ ] **RESP-011**: `1366px` (Desktop)
- [ ] **RESP-012**: `1440px` (Desktop)
- [ ] **RESP-013**: `1600px` (Wide Desktop)
- [ ] **RESP-014**: `1920px` (Ultrawide)

---

## Manual Feature Matrix
At a selection of the constrained widths (e.g., `375px` and `768px`), verify the following features:

### Global Shell
- [ ] **Header**: Verify logo, workspace switcher, and search trigger do not overlap.
- [ ] **Mobile Sidebar**: Toggle the sidebar. Verify it renders as an overlay drawer with a backdrop. Verify background scrolling is prevented.
- [ ] **Context Panels**: Open the Activity or Chat panels. Verify they convert to overlays and do not squish the central layout to an unreadable width.

### Dashboard Grid
- [ ] **Fluid Columns**: Verify the document cards transition smoothly from 1 column on mobile to 2, 3, and 4 columns as the screen expands, without clipping.

### Editor
- [ ] **Horizontal Overflow**: Type a long line of text. Verify the page does not overflow horizontally.
- [ ] **Toolbar**: Check the formatting toolbar. Verify buttons are comfortably tappable (40x40 touch targets) and the container scrolls horizontally if buttons exceed screen width.

### Tldraw Canvas
- [ ] **Zoom/Pan**: Verify the canvas can be panned smoothly. Verify browser UI navigation is not broken outside the canvas area.

## Final Acceptance Criteria
- AUTOMATED = PASS (Linting and Typechecking)
- HUMAN = PENDING (Visual validation of intrinsic sizing and horizontal overflow)
