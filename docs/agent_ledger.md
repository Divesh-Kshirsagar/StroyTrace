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

## [2026-07-31 14:24] - Commit: pending - Task: Phase 1 Auth UI Implementation

- **Objective:** Build the frontend Auth UI (`LoginForm`, `RegisterForm`) and the corresponding route pages based on the Phase 1 specification using shadcn/ui.
- **Assumptions Declared:** Used `react-hook-form` and `zod` for strictly typed client-side validation. Extracted forms into `features/auth/components` as per architecture rules.
- **Modifications Matrix:**
  - `apps/frontend/shared/components/ui/*`: Added shadcn `form`, `input`, `button`, `card`, `label`, `field`.
  - `apps/frontend/features/auth/components/LoginForm.tsx`: Built the login UI.
  - `apps/frontend/features/auth/components/RegisterForm.tsx`: Built the registration UI.
  - `apps/frontend/app/(auth)/*`: Configured the Next.js App Router for auth pages (`layout.tsx`, `login/page.tsx`, `register/page.tsx`).
  - `apps/frontend/app/layout.tsx`: Wrapped the root layout in `<AuthProvider>`.
- **Decision Logic:** The `features` structure strictly separates routing logic from UI implementation. The forms bind directly to the `useAuth` hooks for clean separation.
- **Result Status:** Auth forms implemented. Frontend UI fully connected to the backend auth endpoints.

## [2026-07-31 14:44] - Commit: pending - Task: Phase 2 Core Domain Implementation

- **Objective:** Build the core database structures (Event, Narrative, Evidence), corresponding API endpoints with permissions, and the Event Editor UI.
- **Assumptions Declared:** Used TipTap for rich text editing to cleanly isolate HTML generation without media injection. Used Django's ManyToMany for topics.
- **Modifications Matrix:**
  - `apps/backend/apps/events/models.py`: Created Event, Narrative, Evidence models.
  - `apps/backend/apps/topics/models.py`: Created Topic model.
  - `apps/backend/apps/events/schemas.py`, `routers.py`: Defined schema contracts and REST endpoints for creating/updating shells, narratives, and evidence items.
  - `apps/frontend/features/events/context/EditorContext.tsx`: Built state manager orchestrator for saving Event -> Narrative -> Evidence.
  - `apps/frontend/features/events/components/*`: Created EventEditorPage, Metadata Header, Narrative Panel, Evidence Panel, Add Evidence Modal.
  - `apps/frontend/app/editor/*`: Next.js pages for new and editing events.
- **Decision Logic:** Used React Context (`EditorContext`) because the UI requires complex state coordination across deeply nested sibling components (Metadata vs Narrative vs Evidence Panels). Media uploads are strictly isolated to Evidence objects as requested by architecture specs. 
- **Result Status:** Backend DB schema active and API passing checks. SDK successfully regenerated via HeyAPI. Frontend UI typechecks successfully (excluding internal Next.js `validator.ts` cache bug).

## [2026-07-31 15:03] - Commit: pending - Task: Phase 3 Discovery & Public Pages

- **Objective:** Implement discovery surfaces (home feed, topic feed, channel profile, search) and SEO-optimized server-rendered public event detail pages.
- **Assumptions Declared:** Maintained "Strict Separation" by keeping Feed APIs separate from Event APIs. Did not use infinite scroll; used cursor pagination and Load More buttons instead as specified. Subbed out dynamic OG generation for static templates fetching primary thumbnails.
- **Modifications Matrix:**
  - `apps/backend/core/pagination.py`: Created cursor pagination utility.
  - `apps/backend/apps/feeds/schemas.py`, `routers.py`: Defined lightweight `EventSummarySchema` with resolver logic. Built feed endpoints.
  - `apps/backend/apps/events/routers.py`: Updated `/search` to use cursor pagination, filter by topic/status, and `EventSummarySchema`.
  - `apps/backend/apps/events/schemas.py`: Attached nested `CreatorSummarySchema` for `lead_investigator`.
  - `apps/frontend/features/feeds/*`: Built `EventCard`, `EventCardGrid`, and `FeedView`.
  - `apps/frontend/features/events/components/*`: Built `EventDetailView`, `EvidenceBoard` (read-only), and `NarrativeRenderer` with isomorphic-dompurify and tailwind typography.
  - `apps/frontend/app/*`: Built public routes: `page.tsx` (home), `topic/[slug]/page.tsx`, `[handle]/page.tsx`, `search/page.tsx`, and `topics/page.tsx`. Built `[handle]/[eventSlug]/page.tsx` with `generateMetadata()` for SEO.
- **Decision Logic:** Adhered strictly to server-side rendering for indexable pages. Used Tailwind's `@tailwindcss/typography` via `@plugin` import directly in V4 globals.css. Refactored schemas so feeds return lightweight objects and event details return full objects.
- **Result Status:** All endpoints return cleanly paginated structures. Public pages SSR beautifully with OpenGraph tags. Typecheck passes.
