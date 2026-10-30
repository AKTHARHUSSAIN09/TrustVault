# Security Specification — AICTE FDR Management System

## 1. Data Invariants

1. **Default-Deny Catch-All**: All unlisted paths are strictly denied (`allow read, write: if false;`).
2. **Verified Authentication**: Every write operation requires an authenticated user with `request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates the document ID against `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, `size() <= 128`).
4. **Strict Blueprint Validation**: Every `create` and `update` operation calls `isValid[Entity](incoming())`, enforcing exact `keys().hasAll(...)` and `keys().hasOnly(...)`, type safety, and bounded string lengths.
5. **Identity Integrity & Role Protection**:
   - Users can only create their own `/users/{userId}` document where `userId == request.auth.uid` and `incoming().uid == request.auth.uid`.
   - Non-admin users cannot self-assign `SUPER_ADMIN` or `AICTE_ADMIN` on profile creation unless they match the bootstrapped super admin email (`akthar0109@gmail.com` with `email_verified == true`).
   - Only `isAdmin()` can elevate roles or modify `/systemConfig/{configId}`.
6. **Immutability**: `createdAt`, `uid`, `ownerUid`, and primary identifiers (`fdrId`, `institutionId`, `submissionId`, `logId`) are immutable after creation.
7. **Audit Log Immutability**: `/auditLogs/{logId}` entries are append-only (`allow update, delete: if false;`).
8. **Secure List Queries**: Every `allow list` rule evaluates `resource.data` directly (`resource.data.ownerUid == request.auth.uid || resource.data.orgId == 'AICTE'`) without performing `get()` or `exists()` inside `list`.

## 2. The "Dirty Dozen" Payloads

1. **Shadow Field Injection (`users`)**: Adding `"isSuperUser": true` to `/users/{userId}` creation payload -> Rejected by `hasOnly()`.
2. **Self-Privilege Escalation (`users`)**: Unverified or standard user setting `role: "SUPER_ADMIN"` on `/users/{userId}` -> Rejected by role assignment gate.
3. **Unverified Email Spoofing**: Token with `email: "akthar0109@gmail.com"` but `email_verified: false` attempting admin write -> Rejected by `email_verified == true` check.
4. **ID Poisoning (`fdrs`)**: Document ID containing spaces or >128 characters -> Rejected by `isValidId(fdrId)`.
5. **Owner Spoofing (`fdrs`)**: Creating an FDR with `ownerUid` set to another user's UID -> Rejected by `incoming().ownerUid == request.auth.uid`.
6. **Denial-of-Wallet String Bomb (`submissions`)**: Submitting `notes` with a 50,000-character string -> Rejected by `data.notes.size() <= 1024`.
7. **Update-Gap Type Poisoning (`fdrs`)**: Updating `principalAmount` to a string `"1000000"` instead of a number -> Rejected by `isValidFdrRecord(incoming())` wrapping `allow update`.
8. **Immortal Field Tampering (`institutions`)**: Changing `createdAt` or `ownerUid` during an update -> Rejected by `incoming().createdAt == existing().createdAt && incoming().ownerUid == existing().ownerUid`.
9. **Terminal State Mutation (`fdrs`)**: Non-admin attempting to update an FDR whose existing `status == 'RELEASED'` -> Rejected by terminal state lock.
10. **Audit Log Tampering (`auditLogs`)**: Attempting to update or delete an existing `/auditLogs/{logId}` entry -> Rejected by `allow update, delete: if false`.
11. **PII Blanket Read (`users`)**: Authenticated user attempting `get` on another user's `/users/{otherUserId}` profile without admin status -> Rejected by `isOwner(userId) || isAdmin()`.
12. **Unauthorized System Config Mutation (`systemConfig`)**: Non-admin user attempting to update `/systemConfig/global` -> Rejected by `isAdmin()`.
