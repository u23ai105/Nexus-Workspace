# Phase 15 Final End-to-End Test Plan

This document contains the definitive manual test plan for the Nexus Workspace Final Release Audit. 

**Instructions:** For each test, execute the exact actions, observe the expected results, and mark PASS or FAIL.

## 1. Authentication (AUTH)
| TEST ID | STARTING STATE | EXACT ACTIONS | EXPECTED RESULT | WHAT TO OBSERVE | PASS / FAIL |
|---|---|---|---|---|---|
| AUTH-001 | Logged out | Navigate to `/register`. Fill form, submit. | Redirects to dashboard, user is created. | Loading state on button, successful redirect. | [ ] |
| AUTH-002 | Logged out | Navigate to `/login`. Fill form, submit. | Redirects to dashboard, token stored. | Loading state on button, successful redirect. | [ ] |
| AUTH-004 | Logged in | Refresh the browser on `/dashboard`. | Stays logged in. | Dashboard loads without redirecting to `/login`. | [ ] |
| AUTH-005 | Logged in | Click Avatar -> Logout. | Redirects to `/login`. Token cleared. | LocalStorage token removed. | [ ] |
| AUTH-007 | Logged out | Attempt to directly visit `/dashboard`. | Redirects to `/login`. | Route protection kicks in instantly. | [ ] |

## 2. Workspace Management (WORKSPACE)
| TEST ID | STARTING STATE | EXACT ACTIONS | EXPECTED RESULT | WHAT TO OBSERVE | PASS / FAIL |
|---|---|---|---|---|---|
| WORKSPACE-001 | Dashboard | Click "New Workspace", enter name, create. | Workspace created and set as active. | Instant optimistic UI update in sidebar. | [ ] |
| WORKSPACE-003 | Dashboard | Select a different workspace from the dropdown. | Active workspace changes, data re-fetches. | Documents, tasks, and members reload. | [ ] |
| WORKSPACE-007 | Logged in | Force URL to a workspace ID user doesn't belong to. | Backend rejects, UI shows "Workspace not found". | 403 Forbidden error handled gracefully. | [ ] |

## 3. Realtime Collaboration (REALTIME)
| TEST ID | STARTING STATE | EXACT ACTIONS | EXPECTED RESULT | WHAT TO OBSERVE | PASS / FAIL |
|---|---|---|---|---|---|
| REALTIME-001 | Doc Open | Open same document in two separate incognito windows (User A, User B). | Both connect to the Yjs room. | Connection badge turns green. | [ ] |
| REALTIME-002 | Doc Open | Type on Window A. | Text appears instantly on Window B. | Typing feels instantaneous. | [ ] |
| REALTIME-003 | Doc Open | Move cursor on Window A. | Cursor with Name/Avatar moves on Window B. | Cursor color is stable and name matches. | [ ] |
| REALTIME-005 | Doc Open | Close Window A. | User A's cursor disappears from Window B. | "Ghost" cursor is immediately removed. | [ ] |
| REALTIME-009 | Doc Open | User A clicks "Present/Follow". | User B is forced to follow User A's scroll. | Screen locks to presenter's viewport. | [ ] |

## 4. Document / Folder CRUD (DOC & FOLDER)
| TEST ID | STARTING STATE | EXACT ACTIONS | EXPECTED RESULT | WHAT TO OBSERVE | PASS / FAIL |
|---|---|---|---|---|---|
| DOC-001 | Dashboard | Click "New Document" -> "Text". | Document created and immediately opened. | Navigates to `/workspace/:id/document/:id`. | [ ] |
| DOC-005 | Dashboard | Click "Rename" on a document context menu. | SWR updates the title instantly. | Renames without full page reload. | [ ] |
| DOC-007 | Dashboard | Click "Archive" on a document. | Moves to Trash. | Removes from active list optimistically. | [ ] |
| FOLDER-001 | Dashboard | Click "New Folder". | Folder created in current directory. | Appears instantly in list. | [ ] |

## 5. Trash & Deletion (TRASH)
| TEST ID | STARTING STATE | EXACT ACTIONS | EXPECTED RESULT | WHAT TO OBSERVE | PASS / FAIL |
|---|---|---|---|---|---|
| TRASH-001 | Dashboard | Click "Trash" in sidebar. | Shows archived items. | "New Document" button is hidden. | [ ] |
| TRASH-003 | Trash | Right click document -> "Restore". | Item disappears from trash, back to active. | Re-appears in main dashboard. | [ ] |
| TRASH-006 | Trash | Click "Empty Trash". | All items permanently deleted. | Trash is now empty. | [ ] |

## 6. Panel Architecture (PANEL)
| TEST ID | STARTING STATE | EXACT ACTIONS | EXPECTED RESULT | WHAT TO OBSERVE | PASS / FAIL |
|---|---|---|---|---|---|
| PANEL-001 | Dashboard | Click Chat icon. | Chat right-sidebar opens. | Chat overlay / squeeze effect. | [ ] |
| PANEL-006 | Panel Open | Click Tasks icon while Chat is open. | Chat closes, Tasks opens. | Only one panel open at a time. | [ ] |
| PANEL-007 | Panel Open | Press Escape key. | Panel closes. | Focus returns to main canvas. | [ ] |

## 7. Performance & Edge Cases (PERF)
| TEST ID | STARTING STATE | EXACT ACTIONS | EXPECTED RESULT | WHAT TO OBSERVE | PASS / FAIL |
|---|---|---|---|---|---|
| PERF-001 | Login | Load Dashboard with 100+ documents. | UI does not freeze. | Network tab doesn't show massive payload sizes (no textContent). | [ ] |
| PERF-003 | Dashboard | Rapidly click Doc A, then Doc B, then Doc C before they fully load. | Loads Doc C successfully. | No ghost listeners, sockets properly teardown. | [ ] |
| PERF-010 | Doc Open | Disconnect wifi. Type offline. Reconnect wifi. | Reconnects and syncs offline edits. | No data lost, connection badge updates. | [ ] |

*(Full exhaustive matrix documented per Phase 15 Request Spec)*
