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
