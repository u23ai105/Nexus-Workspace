# PHASE 7 HUMAN TEST PLAN

**Objective**: Verify the Task Management Polish and new metadata integrations (Priority, Assignee, Document Linking).

## TASK-001: Create task
1. Open the Tasks sidebar.
2. Enter a task title and press Enter or click Add.
**Expected**: Task is created immediately (optimistic UI) and appears in the "Not Started" list. Input clears.

## TASK-002: Create High priority task
1. Open the Tasks sidebar.
2. Select "High" from the Priority dropdown (arrow up icon).
3. Create the task.
**Expected**: Task is created with a red High priority semantic tint badge.

## TASK-003: Create Medium priority task
1. Open the Tasks sidebar.
2. Select "Medium" from the Priority dropdown.
3. Create the task.
**Expected**: Task is created with a yellow/amber Medium priority semantic tint badge.

## TASK-004: Create Low priority task
1. Open the Tasks sidebar.
2. Select "Low" from the Priority dropdown.
3. Create the task.
**Expected**: Task is created with a blue Low priority semantic tint badge.

## TASK-005: Assign task to workspace member
1. Open the Tasks sidebar.
2. Click the Assignee dropdown (showing "Assign" or "Unassigned").
3. Select a workspace member.
4. Create the task.
**Expected**: Task is created. The compact avatar and name of the assigned member appear on the task card.

## TASK-006: Create task while viewing document
1. Navigate to a document: `/w/:workspaceId/doc/:docId`.
2. Open the Tasks sidebar.
3. Create a task.
**Expected**: The task automatically links to the document context. A small document link button with the document title appears on the task card.

## TASK-007: Open linked document
1. Find a task with a linked document.
2. Click the document link badge.
**Expected**: The router navigates to the document directly.

## TASK-008: Edit task status
1. Hover over a task in the "Not Started" list.
2. Click the "Start" action button or click the circle icon on the left.
**Expected**: The task immediately moves to "In Progress". The icon changes to an amber clock.

## TASK-009: Edit priority
1. Click the Priority badge on an existing task.
2. Select a different priority.
**Expected**: Priority badge immediately updates to reflect the new selection.

## TASK-010: Edit assignee
1. Click the Assignee badge on an existing task.
2. Select a different member or "Unassigned".
**Expected**: Assignee avatar immediately updates.

## TASK-011: Task hover/action discoverability
1. Hover over any task card.
**Expected**: The actions bar (Start, Complete, Delete) appears at the bottom with a smooth transition.

## TASK-012: Empty state
1. Delete all tasks or go to a workspace with no tasks.
**Expected**: A compact, helpful empty state appears ("No tasks yet") instead of a blank panel.

## TASK-013: Loading state
1. Refresh the page and quickly open the Tasks sidebar.
**Expected**: Skeleton card shapes load smoothly before tasks arrive, avoiding huge layout jumps.

## TASK-014: Error state
1. Turn off your network or force a failure while creating a task.
**Expected**: The optimistic update reverts gracefully or an error is logged. Raw server errors are not splashed on screen.

## TASK-015: Responsive task panel
1. Shrink window width to mobile size.
**Expected**: Task cards do not overflow. Assignee and Priority dropdowns wrap properly within the card.

## TASK-016: Keyboard navigation
1. Open the Tasks panel.
2. Use `Tab` to navigate through the title input, priority, assignee, and add button.
**Expected**: Standard browser focus outlines are visible, dropdowns can be triggered via keyboard.

## TASK-017: VIEWER permission test
1. Log in as a VIEWER to a workspace.
2. Open the Tasks sidebar.
**Expected**: The "Add a new task" form is hidden. Action buttons (Delete, Start, Complete) on existing cards are missing or disabled. Priority and Assignee are read-only text, not dropdowns.

## TASK-018: Cross-workspace document/assignee association attempt
1. (Requires backend tool/API testing)
2. Attempt to POST a task referencing a `documentId` or `assigneeId` that belongs to another workspace.
**Expected**: The server ignores or rejects the ID if validation is strictly enforced by the Prisma relation.
