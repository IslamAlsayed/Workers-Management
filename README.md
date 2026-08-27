# Ommal — Group Login Foundation

## Default groups

- ismail / 1234
- hussein / 5678
- ahmed / 9012

## Important behavior

- No active group exists before login.
- Login authenticates against a group by `id + password`.
- The authenticated `groupId` is stored in `sessionStorage` only.
- Each group's application state is stored separately in LocalStorage:
  `workers-phase1-state-{groupId}`.
- Group definitions are stored separately under `workers-phase1-groups`.

## Architecture

UI -> functions/repositories -> StorageAdapter -> LocalStorage

When the real database is introduced, replace the storage/repository implementation with API calls. The page code should not need to know whether data comes from LocalStorage, IndexedDB, or Laravel API.

## Prototype security note

Passwords are intentionally stored in LocalStorage for this prototype. This is NOT secure authentication. For production, credentials must be handled by a backend (Laravel), passwords must be hashed, and authorization must be enforced server-side.
