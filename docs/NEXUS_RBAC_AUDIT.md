# Nexus Backend RBAC Audit

## Completed Date
August 18, 2026

## Overview
This document summarizes the comprehensive security and RBAC audit conducted across the Nexus backend mutation surface area. The audit ensured that all protected endpoints (POST, PUT, PATCH, DELETE) and Socket.IO events properly verify the authenticated user's role and authorization.

## Audit Findings & Patches

### 1. File Uploads (`file.controller.ts`)
- **Vulnerability**: Previously lacked validation for `VIEWER` roles, allowing viewers to upload files. Failed to verify if `folderId` belonged to the given `workspaceId`.
- **Resolution**: Implemented `getUserRole` validation to explicitly block `VIEWER` accounts from uploading files. Added cross-workspace validation to ensure `folderId` maps to the specified `workspaceId`.

### 2. Document Creation (`document.controller.ts`)
- **Vulnerability**: Previously allowed users to provide a `folderId` that belonged to a completely different workspace.
- **Resolution**: Enforced cross-workspace scoping. The server now queries the folder to ensure `folder.workspaceId === workspaceId` before creating the document.

### 3. Sockets (`socket.ts`)
- **Vulnerability**: Socket handlers (`presentation:start`, `presentation:mute_user`, `chat:message`) lacked persistent backend role verification, blindly trusting role data sent by clients.
- **Resolution**: Introduced a secure `getSocketUserRole` helper that queries the database upon receiving socket events. `presentation:start` is blocked for `VIEWER` roles. `presentation:mute_user` is strictly locked down to `OWNER` and `ADMIN`. Chat messages are now blocked if the user is not a verified workspace member.

### 4. Tasks (`task.routes.ts`)
- **Vulnerability**: Previous implementation checked if the user existed in the `WorkspaceMember` table but failed to account for workspace `OWNER` status reliably (as owners may not have a member record).
- **Resolution**: Refactored to utilize the robust `getUserRole()` helper for POST, PATCH, and DELETE operations. Blocked `VIEWER` access across all task mutations. Implemented cross-workspace `documentId` reference validation on task creation.

### 5. Folders (`folder.routes.ts`)
- **Status**: Secure. Correctly implements `getUserRole()`, blocks `VIEWER` across POST and PATCH methods, and performs rigorous validation on `parentId` and `workspaceId` relationships, including cycle prevention.

### 6. Workspaces (`workspace.controller.ts`)
- **Status**: Secure. `updateWorkspace` enforces `OWNER` or `ADMIN`. `deleteWorkspace` enforces `OWNER`. `emptyTrash` enforces `OWNER` or `ADMIN`.

### 7. Workspace Invitations (`invite.controller.ts`)
- **Status**: Secure implementation added. Generating/regenerating links enforces `OWNER` or `ADMIN`. Uses cryptographic 32-byte tokens hashed via SHA-256 for persistent database storage.

## Conclusion
The backend mutation surface area is fully secured against unauthorized access, cross-workspace ID manipulation, and privilege escalation. The `getUserRole()` helper acts as the unified source of truth for authorization checks.
