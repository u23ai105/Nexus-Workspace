# Panel Layout Human Test Plan

## PANEL-001: Open Chat
**Action:** Click the "Team Chat" button in the Left Sidebar.
**Expected:** The Workspace Chat panel opens on the right side smoothly.

## PANEL-002: Open AI while Chat is open
**Action:** While Workspace Chat is open, click the "AI Assistant" button in the Left Sidebar.
**Expected:** The Workspace Chat closes immediately and the AI chat panel opens.

## PANEL-003: Open Tasks while AI is open
**Action:** While AI Assistant is open, click the "Tasks" button in the Left Sidebar.
**Expected:** The AI chat panel closes and the Action Items/Tasks panel opens.

## PANEL-004: Open Direct Messages while Tasks is open
**Action:** While Tasks is open, click the "Global Messages" icon in the Global Header.
**Expected:** The Tasks panel closes and the Direct Messages overlay panel opens.

## PANEL-005: Open Activity while Direct Messages is open
**Action:** While Direct Messages is open, click the "Workspace Activity" icon in the Global Header.
**Expected:** Direct Messages closes and the Activity feed panel opens.

## PANEL-006: Click active panel button again
**Action:** Click the "Workspace Activity" icon again in the Global Header.
**Expected:** The Activity feed panel closes, leaving 0 active right-side panels.

## PANEL-007: Collapse left sidebar
**Action:** Click the `PanelLeft` toggle icon located next to the "Nexus" logo in the Global Header.
**Expected:** The left Workspace Sidebar transitions out (width 0), and the main document canvas expands cleanly to fill the space.

## PANEL-008: Reopen left sidebar
**Action:** Click the `PanelLeft` toggle icon again.
**Expected:** The left Workspace Sidebar transitions back in without vertical or horizontal layout jumping.

## PANEL-009: Resize desktop → tablet → mobile
**Action:** With a panel open, slowly resize the browser window width down to mobile size (<600px).
**Expected:** 
- The right panel transitions gracefully from an inline block to a hovering drawer overlay.
- No horizontal overlap with main content that causes scrolling or unreadable text.

## PANEL-010: Open each contextual panel on mobile
**Action:** While on a mobile screen width, open each panel one by one.
**Expected:** Only one full-screen contextual panel exists at any given time. Clicking off the panel on the backdrop closes it cleanly.
