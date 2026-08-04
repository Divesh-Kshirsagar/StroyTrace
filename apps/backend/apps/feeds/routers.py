from __future__ import annotations

from django.db import IntegrityError
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from apps.events.models import Event
from apps.feeds.models import Interaction
from core.auth import AuthBearer, OptionalAuthBearer
from core.pagination import paginate_queryset

from .schemas import (
    EventTransparencyResponse,
    InteractRequest,
    InteractResponse,
    PaginatedEventSummarySchema,
    TransparencyFactor,
)

feeds_router = Router(tags=["feeds"])
interact_router = Router(tags=["interactions"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _base_qs():
    return (
        Event.objects.filter(status="published")
        .select_related("lead_investigator", "lead_investigator__creator_profile")
        .prefetch_related(
            "topics",
            "evidence_set",
            Prefetch("interactions", queryset=Interaction.objects.select_related("user")),
        )
    )


def _annotate_viewer(items: list, viewer) -> list:
    """Stamp each event with _viewer_user so the schema resolver can check has_upvoted."""
    for event in items:
        event._viewer_user = viewer
    return items


def _event_transparency_factors(event: Event) -> list[dict]:
    """Aggregate qualitative factors. Uses prefetched interactions cache."""
    factors: list[dict] = []
    # Use the prefetch cache if available; fall back to a fresh query
    if hasattr(event, '_prefetched_objects_cache') and 'interactions' in event._prefetched_objects_cache:
        interactions = list(event._prefetched_objects_cache['interactions'])
    else:
        interactions = list(event.interactions.select_related("user").all())

    # Verified contributors
    verified_count = sum(
        1 for i in interactions if getattr(i.user, "email_verified", False)
    )
    if verified_count > 0:
        factors.append(
            {
                "factor": "verified_engagement",
                "label": f"{verified_count} verified contributor(s) engaged",
                "status": "positive",
            }
        )

    # Discussion health: comment-to-upvote ratio > 0.2 signals sustained debate
    upvotes = sum(1 for i in interactions if i.interaction_type == "upvote")
    comments = sum(1 for i in interactions if i.interaction_type == "comment")
    if upvotes > 0 and comments / upvotes > 0.2:
        factors.append(
            {
                "factor": "sustained_discussion",
                "label": "Healthy discussion ratio",
                "status": "positive",
            }
        )

    # Recency
    if event.last_interaction_at:
        hours_ago = (timezone.now() - event.last_interaction_at).total_seconds() / 3600
        if hours_ago < 24:
            factors.append(
                {
                    "factor": "recent_activity",
                    "label": "Active in the last 24 hours",
                    "status": "positive",
                }
            )

    return factors


# ---------------------------------------------------------------------------
# Feed endpoints
# ---------------------------------------------------------------------------

@feeds_router.get("/home", response=PaginatedEventSummarySchema, auth=None)
def home_feed(
    request,
    sort: str = "trending",
    cursor: str | None = None,
    limit: int = 20,
):
    """
    Returns the home feed.  Use ``?sort=trending`` (default) or ``?sort=latest``.
    """
    viewer = OptionalAuthBearer()(request)
    qs = _base_qs()
    valid_sort = sort if sort in ("trending", "latest") else "trending"
    result = paginate_queryset(qs, cursor, limit, sort=valid_sort)
    result["items"] = _annotate_viewer(result["items"], viewer)
    return result


@feeds_router.get("/topic/{slug}", response=PaginatedEventSummarySchema, auth=None)
def topic_feed(request, slug: str, cursor: str | None = None, limit: int = 20):
    viewer = OptionalAuthBearer()(request)
    qs = _base_qs().filter(topics__slug=slug)
    result = paginate_queryset(qs, cursor, limit, sort="trending")
    result["items"] = _annotate_viewer(result["items"], viewer)
    return result


@feeds_router.get("/channel/{handle}", response=PaginatedEventSummarySchema, auth=None)
def channel_feed(
    request, handle: str, cursor: str | None = None, limit: int = 20
):
    viewer = OptionalAuthBearer()(request)
    qs = _base_qs().filter(lead_investigator__creator_profile__handle=handle)
    result = paginate_queryset(qs, cursor, limit, sort="latest")
    result["items"] = _annotate_viewer(result["items"], viewer)
    return result


# ---------------------------------------------------------------------------
# Transparency endpoint
# ---------------------------------------------------------------------------

@feeds_router.get(
    "/events/{slug}/transparency",
    response=EventTransparencyResponse,
    auth=None,
)
def get_event_transparency(request, slug: str):
    """
    Returns qualitative factors explaining why an event is trending.
    Does NOT expose raw scores or mathematical formula weights.
    Works for both anonymous and authenticated users.
    """
    from apps.feeds.services.confidence import EngagementConfidenceService
    from core.auth import OptionalAuthBearer

    event = get_object_or_404(
        Event.objects.prefetch_related(
            Prefetch("interactions", queryset=Interaction.objects.select_related("user"))
        ),
        slug=slug,
    )

    # Resolve the requesting user without requiring authentication
    auth_user = OptionalAuthBearer()(request)

    viewer_factors: list[dict] = []
    viewer_has_upvoted = False
    if auth_user:
        viewer_factors = EngagementConfidenceService.get_qualitative_factors(auth_user)
        viewer_has_upvoted = event.interactions.filter(
            user=auth_user, interaction_type="upvote"
        ).exists()

    interactions = list(event.interactions.all())
    upvote_count = sum(1 for i in interactions if i.interaction_type == "upvote")
    comment_count = sum(1 for i in interactions if i.interaction_type == "comment")
    share_count = sum(1 for i in interactions if i.interaction_type == "share")

    event_factors = _event_transparency_factors(event)

    return EventTransparencyResponse(
        event_slug=event.slug,
        trending_score=event.trending_score,
        total_interactions=len(interactions),
        upvote_count=upvote_count,
        comment_count=comment_count,
        share_count=share_count,
        viewer_has_upvoted=viewer_has_upvoted,
        viewer_factors=[TransparencyFactor(**f) for f in viewer_factors],
        event_factors=[TransparencyFactor(**f) for f in event_factors],
    )


# ---------------------------------------------------------------------------
# Interaction endpoints
# ---------------------------------------------------------------------------

VALID_INTERACTION_TYPES = {t.value for t in Interaction.InteractionType}


@interact_router.post(
    "/events/{slug}/interact",
    response=InteractResponse,
    auth=AuthBearer(),
)
def create_interaction(request, slug: str, payload: InteractRequest):
    """Create an interaction (upvote / comment / share) on an event."""
    if payload.type not in VALID_INTERACTION_TYPES:
        raise HttpError(400, f"Invalid interaction type. Must be one of: {', '.join(sorted(VALID_INTERACTION_TYPES))}")

    event = get_object_or_404(Event, slug=slug)

    try:
        _interaction, created = Interaction.objects.get_or_create(
            user=request.auth,
            event=event,
            interaction_type=payload.type,
        )
    except IntegrityError:
        raise HttpError(400, "You have already performed this interaction")

    if not created:
        raise HttpError(400, "You have already performed this interaction")

    # Refresh the event score from DB (signal will have updated it synchronously)
    event.refresh_from_db(fields=["trending_score"])
    return InteractResponse(success=True, new_score=event.trending_score)


@interact_router.delete(
    "/events/{slug}/interact",
    response=InteractResponse,
    auth=AuthBearer(),
)
def remove_interaction(request, slug: str, payload: InteractRequest):
    """Remove an interaction from an event."""
    if payload.type not in VALID_INTERACTION_TYPES:
        raise HttpError(400, f"Invalid interaction type. Must be one of: {', '.join(sorted(VALID_INTERACTION_TYPES))}")

    event = get_object_or_404(Event, slug=slug)

    deleted_count, _ = Interaction.objects.filter(
        user=request.auth,
        event=event,
        interaction_type=payload.type,
    ).delete()

    if deleted_count == 0:
        raise HttpError(404, "Interaction not found")

    event.refresh_from_db(fields=["trending_score"])
    return InteractResponse(success=True, new_score=event.trending_score)
