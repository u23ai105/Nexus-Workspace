# Nexus Workspace Invite Architecture

This document details the security model, lifecycle, and implementation details for Workspace Invite Links in Nexus.

## Core Principles
1. **Cryptographic Randomness**: The invite token is generated using 32 bytes of cryptographically secure random data (`crypto.randomBytes(32)`).
2. **Hashed Storage**: The raw token is NEVER stored in the database. Instead, a SHA-256 hash (`tokenHash`) is stored. This prevents token leakage via database dumps.
3. **Restricted Generation**: Only `OWNER` or `ADMIN` roles can generate or regenerate a workspace invite link.
4. **Role Safety**: A public invite link defaults to joining users as `VIEWER` or `EDITOR` (specified by the link creator). It is physically impossible to generate an `OWNER` or `ADMIN` invite link.
5. **No Long-Lived Insecure Credentials**: Regeneration immediately revokes the active token for that workspace.

## Database Schema (`WorkspaceInvite` Model)

```prisma
model WorkspaceInvite {
  id          String   @id @default(uuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  tokenHash   String   @unique
  createdById String?
  creator     User?     @relation(fields: [createdById], references: [id], onDelete: SetNull)
  defaultRole WorkspaceRole @default(VIEWER)
  expiresAt   DateTime?
  createdAt   DateTime @default(now())

  @@index([workspaceId])
}
```

*Note on `createdById`: The relation uses `onDelete: SetNull`. This ensures that if the admin who created the link leaves the workspace or deletes their account, the invite link remains valid for the workspace until intentionally revoked.*
*Note on Indexing: We removed `@@index([tokenHash])` because `@unique` already automatically creates an index in PostgreSQL.*

## Invite Lifecycle

1. **CREATE**: An Admin/Owner requests an invite link. The server generates a random 32-byte token, computes the SHA-256 hash, and stores the `WorkspaceInvite` record. The raw token is returned to the client exactly once.
2. **VIEW/PREVIEW**: An unauthenticated (or authenticated) user visits `/join/:token`. The frontend calls `GET /api/workspaces/invites/:token`. The server computes the hash, looks up the invite, and returns *only* the `workspace.name` and `creator.name`. No member lists, emails, or internal IDs are exposed.
3. **JOIN**: An authenticated user clicks "Join". `POST /api/workspaces/invites/:token/join` is called. The server verifies:
   - User is authenticated.
   - Token hash matches an active invite.
   - Invite is not expired (`expiresAt > now()`).
   - User is not already a member (idempotency: if they are, it returns success without duplicating the row).
   The user is then added as `WorkspaceMember` with the `defaultRole` specified by the invite.
4. **REGENERATE**: The Admin/Owner requests a new link. The server deletes any existing `WorkspaceInvite` records for that workspace and creates a new one. This implicitly revokes the old link.

## Security Trade-Offs & Decisions
- **One Active General Invite**: To keep the mental model simple for users, a workspace has exactly **ONE** active general invite link. Generating a new one destroys the old one.
- **Expiration**: Invites have a default expiration of 7 days. This prevents ancient links from floating around the internet and being used months later.
- **Client-Side Hashing?**: We hash on the server. The client sends the raw token over HTTPS. The server immediately hashes it before any logging or database interaction.
