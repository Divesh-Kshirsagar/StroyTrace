# 0001 — Ranking System: Engagement Confidence + Hacker News Time Decay

## Decision

Implement a two-stage feed ranking system:

1. **Engagement Confidence Score** — A 0.0–1.0 per-user trust multiplier that weights interactions from higher-quality accounts more than those from suspicious or new accounts.
2. **Hacker News-style Time Decay** — A decay function `1 / (age_hours + base) ^ gravity` that ensures newer content naturally surfaces above older content with equal raw engagement.

The combined formula is:

```
trending_score = Σ (interaction_weight × user_confidence × time_decay)
```

All numerical weights live in environment variables (never committed), making the algorithm transparent in the open-source code while keeping the production tuning private.

## Reason

- **Gaming resistance:** Weighting by account age, email verification, and profile completeness raises the cost of creating fake accounts to manipulate the feed.
- **Open-source safety:** Publishing the formula structure (but not the weights) lets the community audit the algorithm's fairness without enabling easy tuning-based abuse.
- **Transparency:** A `/feed/events/{slug}/transparency` endpoint returns qualitative human-readable factors (not scores) so users understand why something is trending.

## Affected Entities / Components

| Layer | Entity / File | Change |
|---|---|---|
| DB schema | `events.Event` | Added `trending_score (FloatField, indexed)` and `last_interaction_at (DateTimeField, indexed)` |
| DB schema | `feeds.Interaction` | New model with `UniqueConstraint(user, event, interaction_type)` |
| Service | `apps/feeds/services/confidence.py` | `EngagementConfidenceService` — returns 0.0–1.0 score and qualitative factors |
| Service | `apps/feeds/services/scoring.py` | `TrendingScoreService` — formula implementation + DB update |
| Signal | `apps/feeds/signals.py` | `post_save` / `post_delete` on `Interaction` → triggers score recalculation |
| Task | `apps/feeds/tasks.py` | Synchronous wrapper, ARQ-compatible signature for future queue promotion |
| API | `apps/feeds/routers.py` | `POST/DELETE /feed/events/{slug}/interact`, `GET /feed/events/{slug}/transparency` |
| API | `apps/feeds/routers.py` | `GET /feed/home?sort=trending|latest` |
| Frontend | `features/feeds/components/UpvoteButton.tsx` | Optimistic UI toggle (upvote/remove-upvote) |
| Frontend | `features/feeds/components/TransparencyTooltip.tsx` | Lazy-loaded tooltip with event + viewer qualitative factors |
| Frontend | `features/feeds/components/SortToggle.tsx` | Server-side-aware trending/latest toggle |
| Frontend | `features/feeds/components/EventCard.tsx` | Restructured from single Link to nested Link + interaction bar |
| Config | `config/settings.py`, `.env.example` | 11 new `RANKING_*` env vars |

## Validation / Migration Implications

- Migration `events/0004_add_trending_score_fields.py`: backward-compatible (new nullable field + FloatField with default).
- Migration `feeds/0001_add_interaction_model.py`: new table, no impact on existing data.
- All 40 backend tests pass (`uv run pytest`).
- Frontend typechecks clean and builds clean.
- Score updates run synchronously in signal handlers for the MVP. When ARQ is introduced, `tasks.py` already has the correct async signature — only the signal call-site needs to change.

## Score Update Architecture (MVP vs Future)

**MVP (current):** Signal → synchronous function call in same process thread.  
**Future:** Signal → enqueue ARQ job → background worker recalculates independently.

The `update_event_trending_score_sync` function in `tasks.py` is intentionally named with `_sync` so the migration path is obvious.
