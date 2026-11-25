# OmniLab 3D — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Identity & Email Verification**: All writes and reads require `request.auth != null` and `request.auth.token.email_verified == true`.
2. **PII Isolation**: `/students/{studentId}` contains student `email` and `rollNumber`. Only the owning student (`request.auth.uid == studentId`) can `get`, `create`, or `update` their own profile. Collection `list` on `/students` is strictly denied (`false`).
3. **Master Gate on Subcollection**: Every `get`, `create`, `update`, and `delete` on `/students/{studentId}/experiments/{experimentId}` verifies both ownership (`studentId == request.auth.uid`) and parent profile existence (`exists(/databases/$(database)/documents/students/$(studentId))`).
4. **Immutable Ownership & Timestamps**: `uid` / `studentId`, `email`, `experimentId`, and `createdAt` are immutable after creation. Both `createdAt` (on create) and `updatedAt` (on create/update) must equal `request.time`.
5. **Bounded Payloads & Strict Allowlists**: `keys().hasAll(...) && keys().hasOnly(...)` on `create` and `affectedKeys().hasOnly(...)` on `update` block shadow/ghost fields. All strings and arrays have explicit `.size()` upper bounds (`graphPoints.size() <= 24`, `observations.size() <= 20`).
6. **Secure List Queries**: `allow list` on `/students/{studentId}/experiments` requires `isVerifiedOwner(studentId) && resource.data.studentId == request.auth.uid` without `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Unauthenticated Profile Read**: Unauthenticated `get(/students/uid_a)`.
2. **Cross-User Profile Read (PII Leak)**: Signed-in `uid_b` tries `get(/students/uid_a)`.
3. **Unverified Email Bypass**: Signed-in `uid_a` with `email_verified: false` tries `create(/students/uid_a)`.
4. **Profile Collection Scrape**: Signed-in `uid_a` tries `list(/students)`.
5. **Identity Spoofing on Create**: Signed-in `uid_a` tries `create(/students/uid_a)` with `uid: "uid_b"`.
6. **Shadow Field ("Ghost Key") Injection**: Signed-in `uid_a` includes `isAdmin: true` or `role: "teacher"` on `/students/uid_a` create or update.
7. **ID Poisoning / Path Traversal**: Signed-in `uid_a` tries `create(/students/uid_a/experiments/bad..id)` with non-alphanumeric ID or >128 chars.
8. **Orphan Subcollection Write (Master Gate Bypass)**: Signed-in `uid_a` tries `create(/students/uid_a/experiments/phy-1)` before `/students/uid_a` exists.
9. **Client Timestamp Spoofing**: Signed-in `uid_a` passes a backdated `createdAt` or `updatedAt` != `request.time`.
10. **Immutable Field Tampering**: Signed-in `uid_a` tries `update(/students/uid_a)` changing `email` or `uid` or `createdAt`.
11. **Array / Payload Overflow (Denial of Wallet)**: Signed-in `uid_a` writes `graphPoints` with 25+ items or `result` string > 100 chars.
12. **Score Out-of-Range / Type Poisoning**: Signed-in `uid_a` writes `vivaScore: 999` or `completed: "yes"` or mutates `studentId` on experiment update.
