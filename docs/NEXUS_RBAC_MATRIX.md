# Nexus Workspace RBAC Matrix

This document is the definitive source of truth for Role-Based Access Control (RBAC) in Nexus Workspace.

## Roles

The system supports four explicit roles, cascading in authority:

1. **OWNER**: Absolute control over the workspace and its resources.
2. **ADMIN**: Workspace and team management capabilities, but cannot usurp the owner.
3. **EDITOR**: Full access to mutate content (documents, tasks, files) but no workspace or team management capabilities.
4. **VIEWER**: Strictly read-only access to content. Cannot mutate anything.

## Feature Matrix

| Resource / Action | OWNER | ADMIN | EDITOR | VIEWER | Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Workspace** | | | | | |
| Rename Workspace | Yes | Yes | No | No | Core identity change; requires administrative trust. |
| Delete Workspace | Yes | No | No | No | Highly destructive. Only the true owner can destroy the workspace. |
| Empty Trash | Yes | Yes | No | No | Destructive action clearing deleted items permanently. |
| **Team Management** | | | | | |
| Add Members (Invite) | Yes | Yes | No | No | Controls who has access to the workspace context. |
| Remove Members | Yes | Yes* | No | No | *Admins cannot remove Owners or other Admins. |
| Change Roles | Yes | Yes* | No | No | *Admins cannot promote to/demote from Owner or Admin. |
| Generate Invite Link | Yes | Yes | No | No | Generates access vectors to the workspace. |
| Regenerate Link | Yes | Yes | No | No | Invalidates existing access vectors. |
| **Documents** | | | | | |
| Create Document | Yes | Yes | Yes | No | Standard content contribution. |
| Edit Document Text | Yes | Yes | Yes | No | Standard content contribution. |
| Rename Document | Yes | Yes | Yes | No | Content mutation. |
| Delete (Archive) | Yes | Yes | Yes | No | Soft-delete. Editors can clean up. |
| Permanent Delete | Yes | Yes | No | No | Hard-delete. Only Admins/Owners can permanently bypass the trash. |
| Restore from Trash | Yes | Yes | Yes | No | Reverting an archive. |
| **Folders** | | | | | |
| Create Folder | Yes | Yes | Yes | No | Organizational mutation. |
| Rename Folder | Yes | Yes | Yes | No | Organizational mutation. |
| Delete (Archive) | Yes | Yes | Yes | No | Organizational cleanup. |
| **Files** | | | | | |
| Upload File | Yes | Yes | Yes | No | Content mutation. |
| Rename File | Yes | Yes | Yes | No | Content mutation. |
| Delete File | Yes | Yes | No | No | Permanent action (deleted from S3 bucket). Restricted to Admins/Owners. |
| **Tasks** | | | | | |
| Create Task | Yes | Yes | Yes | No | Standard project contribution. |
| Update/Assign Task | Yes | Yes | Yes | No | Standard project contribution. |
| Delete Task | Yes | Yes | Yes | No | Tasks are transient; Editors can delete them. |
| **Chat / Sockets** | | | | | |
| Send Chat Message | Yes | Yes | Yes | Yes | **Exception**: Viewers CAN participate in chat to ask questions about the read-only documents. |
| Follow / Presentation | Yes | Yes | Yes | Yes | Viewers can follow someone presenting. |
| Mute User (Audio) | Yes | Yes | No | No | Administrative moderation tool. |

## Notes
- **Cross-Workspace Security**: An `ADMIN` in Workspace A is completely unprivileged (cannot even read) in Workspace B unless explicitly invited. Backend routes must *always* verify `workspaceId` against the user's membership.
- **Join by Invite**: Users joining via a public invite link join with the role defined by the link creator (either `VIEWER` or `EDITOR`). Link creators cannot create `ADMIN` or `OWNER` links.
