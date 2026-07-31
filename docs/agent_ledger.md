## [2026-07-31 13:40] - Commit: pending - Task: Restructure Repositories for Domain & Feature Boundaries

- **Objective:** Re-architect the backend and frontend into strict Domain-Driven and Feature-Driven structures, preparing for HeyAPI integration.
- **Assumptions Declared:** Assuming it is safe to wipe the previous scaffolding `db.sqlite3` and migrations since no real data exists. 
- **Modifications Matrix:**
  - `apps/backend/api/` -> Split into `apps/users`, `apps/topics`, `apps/events`, `apps/feeds`.
  - `apps/backend/core/` -> Renamed to `apps/backend/config/`. Restored `apps/backend/core/` for shared utilities.
  - `apps/frontend/app/` -> Cleaned up, created `(auth)`, `(marketing)`, `[handle]/[eventSlug]`.
  - `apps/frontend/features/` -> Initialized `auth`, `events`, `channels`.
  - `apps/frontend/shared/` -> Initialized `components/ui`, `hooks`, `lib`, `styles`.
  - `apps/frontend/components.json` -> Updated paths to use `@/shared/components`.
  - `.agent-context.md` -> Added the "No Cross-Feature", "Thin App", and "Backend Boundary" rules.
- **Decision Logic:** Used Python scripts via terminal to cleanly write and refactor the files. Re-ran migrations from scratch to ensure the database correctly recognizes the new app boundaries (`users_user`, `events_event`, etc.).
- **Result Status:** Backend starts cleanly with 0 issues. Frontend directories perfectly mirror the requested strict feature module layout.
