# Phase 5: Trash & Deletion - Human Test Plan

Please execute the following tests manually to verify the Trash, Permanent Deletion, and Recovery mechanisms.

## Prerequisites
1. Ensure you have **OWNER** or **ADMIN** access for most tests.
2. Ensure you have a test user with **EDITOR** or **VIEWER** access to verify role enforcement.
3. You need to create nested structures.

---

### Test 1: UI State & Visibility
- [ ] Navigate to the Trash view (click "Trash" in the sidebar).
- [ ] Verify the header clearly says "Trash".
- [ ] Verify the "Create New" dropdown button in the sidebar is completely hidden while in Trash.
- [ ] Verify that if you are an OWNER or ADMIN, the red "Empty Trash" button appears at the top right of the dashboard.
- [ ] Verify that context menus on Trash items display "Restore" and "Delete Permanently" (they should NOT show "Archive").

### Test 2: Role-based Authorization (UI)
- [ ] Log in as an EDITOR or VIEWER.
- [ ] Navigate to Trash.
- [ ] Verify the "Empty Trash" button is hidden.
- [ ] Verify "Delete Permanently" is hidden from the context menu (if applicable) or returns a 403 error if clicked.

### Test 3: The Cascade Safety Test (CRITICAL)
1. In your main workspace root, create `Folder A`.
2. Inside `Folder A`, create `Document A` and `File A`.
3. Inside `Folder A`, create `Folder B`.
4. Inside `Folder B`, create `Document B` and `File B`.
5. Soft-delete (Trash) `Folder A`. (Verify it disappears from the workspace).
6. Navigate to Trash. You should see `Folder A`.
7. Click the `...` menu on `Folder A` and select **Delete Permanently**.
8. Refresh the Workspace root. **Expected result**: Nothing from Folder A or Folder B should reappear. All nested documents, files, and folders should be permanently destroyed.

### Test 4: Restore Hierarchy Behavior
1. Create `Folder X` in the workspace root.
2. Inside `Folder X`, create `Document Y`.
3. Trash `Document Y`.
4. Navigate to Trash and Restore `Document Y`.
5. **Expected result**: `Document Y` is back inside `Folder X`.
6. Trash `Document Y` again.
7. Trash `Folder X` and then Permanently Delete `Folder X` from Trash.
8. Now, navigate to Trash and Restore `Document Y`.
9. **Expected result**: Because its parent folder is permanently gone, `Document Y` is restored safely to the workspace root.

### Test 5: Empty Trash Action & Dialog
- [ ] Navigate to Trash with multiple items inside.
- [ ] Click the "Empty Trash" button.
- [ ] Verify an `AlertDialog` appears requiring confirmation (it should not be a browser `window.confirm`).
- [ ] Press `Escape` on your keyboard to verify the dialog closes.
- [ ] Click "Empty Trash" again and confirm.
- [ ] Verify all items instantly disappear from the screen.
- [ ] Verify active workspace items were NOT affected.

### Test 6: Cross-Workspace Safety (Manual API Check)
If you have access to a tool like Postman or `curl`:
- [ ] Attempt to call `DELETE /api/workspaces/<workspace-id>/trash` using a `workspace-id` that you are not a part of.
- [ ] Verify it returns a `403 Forbidden` or `404 Not Found`.
