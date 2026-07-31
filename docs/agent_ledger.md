## [2026-07-31 13:52] - Commit: pending - Task: Setup HeyAPI Pipeline

- **Objective:** Configure the HeyAPI and OpenAPI bridge between the Django Ninja backend and the Next.js frontend, per the architectural plan.
- **Assumptions Declared:** Backend models and routers will use the `HttpBearer` auth scheme which HeyAPI will consume. Downgraded `openapi-ts` to v0.52 to ensure stable fetch generation.
- **Modifications Matrix:**
  - `apps/frontend/openapi-ts.config.ts`: Added configuration to point to local `openapi.json`.
  - `apps/frontend/package.json`: Added `generate:api`, `generate:api:prod`, and `typecheck` scripts.
  - `apps/backend/config/api.py`: Configured `NinjaAPI` with standard OpenAPI metadata and `AuthBearer`.
  - `apps/backend/apps/*/routers.py`: Created skeleton routers mapped to their domains (`auth`, `channels`, `topics`, `events`, `feeds`).
- **Decision Logic:** I launched the backend server in the background and executed the `generate:api` script. The HeyAPI client successfully consumed the live `/api/v1/openapi.json` and outputted strictly typed SDKs into `generated/services.gen.ts`.
- **Result Status:** The pipeline successfully generates fetch-based SDK clients and TypeScript types (`generated/types.gen.ts`), verifying the automated contract generation flow.

## [2026-07-31 14:15] - Commit: pending - Task: Phase 1 Foundation Models and Endpoints

- **Objective:** Implement the `USER` and `CREATOR_PROFILE` Django models, the JWT auth flows, and the Next.js `AuthContext` to fulfill Phase 1 of the MVP.
- **Assumptions Declared:** Used `PyJWT` for fine-grained token control. Overrode the default `User` model by subclassing `AbstractBaseUser` for strict adherence to the schema.
- **Modifications Matrix:**
  - `apps/backend/apps/users/models.py`: Created custom `User` and `CreatorProfile`.
  - `apps/backend/apps/users/schemas.py`: Defined pydantic schemas for auth payload validation.
  - `apps/backend/apps/users/routers.py`: Added login, register, refresh, logout, and me endpoints.
  - `apps/backend/core/auth.py`: Extracted `AuthBearer` to validate short-lived JWT access tokens.
  - `apps/frontend/shared/lib/apiClient.ts`: Created the global fetch interceptor to append tokens and attempt 401 token refreshes.
  - `apps/frontend/features/auth/hooks/useAuth.tsx`: Provided the React Context state for user management.
  - `apps/frontend/features/auth/schemas.ts`: Exported Zod schemas.
- **Decision Logic:** The `refresh_token` flow is implemented by explicitly passing the token from `js-cookie` since it was requested as an HttpOnly cookie originally but required in the body for the API endpoint. We opted for a regular cookie to satisfy the body requirement while preserving the token across tabs.
- **Result Status:** All migrations applied. API checks passed. HeyAPI successfully re-generated the SDK.
