"""
Management command: seed_dev_data

Seeds the local development database with a realistic dataset for testing
the ranking system. Run after seed_global_topics.

Idempotent: already-existing users/events/interactions are skipped by
handle/slug/email uniqueness checks.

Test accounts created
---------------------
All accounts use password: testpass123

  handle          email                       role
  ──────────────────────────────────────────────────────
  @alice          alice@clarity.dev           verified creator, 40-day-old account
  @bob            bob@clarity.dev             newer creator, 15-day-old account
  @carol          carol@clarity.dev           fresh creator, 2-day-old account
  @dan            dan@clarity.dev             reader only (no events)

Test events created
-------------------
Events are seeded with different interaction patterns so trending vs. latest
sort orders produce visibly different results:

  slug                        creator   interactions             trending rank
  ──────────────────────────────────────────────────────────────────────────
  surveillance-state          alice     10 upvotes + 3 shares    high (recent + quality)
  big-tech-monopoly           alice     5 upvotes, 1hr old       medium
  climate-cover-up            bob       8 upvotes, 6h old        medium
  pharma-trial-fraud          carol     2 upvotes, 30min old     lower (fresh account)
  old-corruption-case         alice     15 upvotes, 72h old      low (time-decayed)
  draft-investigation         alice     0 interactions           not in feed (draft)
"""
from __future__ import annotations

from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.events.models import Event, Evidence, Narrative
from apps.feeds.models import Interaction
from apps.feeds.services.scoring import TrendingScoreService
from apps.topics.models import Topic
from apps.users.models import CreatorProfile, User


# ---------------------------------------------------------------------------
# Seed data definitions
# ---------------------------------------------------------------------------

CREATORS = [
    {
        "email": "alice@clarity.dev",
        "password": "testpass123",
        "handle": "alice",
        "display_name": "Alice Thornton",
        "bio": "Investigative journalist covering surveillance and civil liberties.",
        "avatar_url": "https://i.pravatar.cc/150?u=alice",
        "is_verified": True,
        "account_age_days": 40,
        "topics": ["technology", "human-rights", "politics"],
    },
    {
        "email": "bob@clarity.dev",
        "password": "testpass123",
        "handle": "bob",
        "display_name": "Bob Karimi",
        "bio": "Environmental reporter and data journalist.",
        "avatar_url": "https://i.pravatar.cc/150?u=bob",
        "is_verified": False,
        "account_age_days": 15,
        "topics": ["environment", "science", "corporate"],
    },
    {
        "email": "carol@clarity.dev",
        "password": "testpass123",
        "handle": "carol",
        "display_name": "Carol Lin",
        "bio": "Health and pharmaceutical industry watchdog.",
        "avatar_url": "https://i.pravatar.cc/150?u=carol",
        "is_verified": False,
        "account_age_days": 2,
        "topics": ["health", "corporate"],
    },
    {
        "email": "dan@clarity.dev",
        "password": "testpass123",
        "handle": "dan",
        "display_name": "Dan Readers",
        "bio": "Curious reader. No investigations yet.",
        "avatar_url": "https://i.pravatar.cc/150?u=dan",
        "is_verified": False,
        "account_age_days": 20,
        "topics": [],
    },
]

# Each event entry: creator handle, publish status, age offset in hours,
# interaction pattern: list of (interactor_handle, type) tuples
EVENTS = [
    {
        "title": "The Surveillance State Expansion",
        "slug": "surveillance-state",
        "summary": (
            "A multi-year investigation into warrantless data collection programs "
            "operating across five countries, and the private contractors profiting from them."
        ),
        "creator": "alice",
        "status": "published",
        "start_date": date.today() - timedelta(days=5),
        "age_hours": 3,  # published 3 hours ago
        "topics": ["technology", "human-rights"],
        "narrative": (
            "<h2>What We Found</h2>"
            "<p>Documents obtained via FOIA requests reveal that AxisData Corp "
            "sold bulk communications metadata to three national intelligence "
            "agencies without any judicial oversight. The contracts span 2019–2024.</p>"
            "<p>Cross-referencing leaked procurement databases with public company "
            "filings shows $240M in undisclosed government contracts.</p>"
        ),
        "evidence": [
            {
                "media_type": "document",
                "source_url": "https://example.com/foia-docs.pdf",
                "caption": "FOIA response — AxisData contracts, 2019-2024",
                "display_order": 0,
            },
            {
                "media_type": "image",
                "source_url": "https://picsum.photos/seed/surv/800/450",
                "thumbnail_url": "https://picsum.photos/seed/surv/800/450",
                "caption": "Server infrastructure map — redacted locations",
                "display_order": 1,
            },
        ],
        "interactions": [
            ("alice", "upvote"),
            ("bob", "upvote"),
            ("carol", "upvote"),
            ("dan", "upvote"),
            ("alice", "share"),
            ("bob", "share"),
            ("carol", "share"),
            ("dan", "comment"),
            ("bob", "comment"),
            ("carol", "comment"),
        ],
    },
    {
        "title": "Big Tech's Monopoly Playbook",
        "slug": "big-tech-monopoly",
        "summary": (
            "How three major platforms coordinated to acquire and kill competitor "
            "startups in violation of antitrust law."
        ),
        "creator": "alice",
        "status": "published",
        "start_date": date.today() - timedelta(days=2),
        "age_hours": 1,
        "topics": ["technology", "corporate"],
        "narrative": (
            "<h2>The Kill Zone</h2>"
            "<p>Internal strategy memos from 2021 reveal a coordinated "
            '"buy or bury" approach targeting early-stage competitors '
            "in the productivity and communication space.</p>"
        ),
        "evidence": [
            {
                "media_type": "image",
                "source_url": "https://picsum.photos/seed/tech/800/450",
                "thumbnail_url": "https://picsum.photos/seed/tech/800/450",
                "caption": "Acquisition timeline chart, 2018–2023",
                "display_order": 0,
            },
        ],
        "interactions": [
            ("bob", "upvote"),
            ("carol", "upvote"),
            ("dan", "upvote"),
            ("alice", "upvote"),
            ("dan", "upvote"),  # duplicate guard will block this — same type
        ],
    },
    {
        "title": "Climate Data Cover-Up at Major Oil Consortium",
        "slug": "climate-cover-up",
        "summary": (
            "Internal models from a major oil consortium predicted 2°C warming "
            "by 2040 as early as 1993 — decades before public acknowledgment."
        ),
        "creator": "bob",
        "status": "published",
        "start_date": date.today() - timedelta(days=10),
        "age_hours": 6,
        "topics": ["environment", "corporate"],
        "narrative": (
            "<h2>The Suppressed Models</h2>"
            "<p>Leaked internal research shows that GulfPetro's own climate "
            "scientists predicted catastrophic warming with high confidence in 1993. "
            "The models were buried in favour of public uncertainty campaigns.</p>"
        ),
        "evidence": [
            {
                "media_type": "document",
                "source_url": "https://example.com/gulfpetro-1993-model.pdf",
                "caption": "GulfPetro internal climate model, 1993 (leaked)",
                "display_order": 0,
            },
            {
                "media_type": "youtube",
                "source_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                "caption": "Documentary excerpt — The Carbon Diaries",
                "display_order": 1,
            },
        ],
        "interactions": [
            ("alice", "upvote"),
            ("carol", "upvote"),
            ("dan", "upvote"),
            ("alice", "comment"),
            ("bob", "share"),
            ("carol", "comment"),
            ("dan", "share"),
            ("alice", "share"),
        ],
    },
    {
        "title": "Pharmaceutical Trial Data Fraud",
        "slug": "pharma-trial-fraud",
        "summary": (
            "A regulatory submission for a widely approved painkiller omitted "
            "adverse event data from two Phase III trials."
        ),
        "creator": "carol",
        "status": "published",
        "start_date": date.today() - timedelta(days=1),
        "age_hours": 0.5,
        "topics": ["health", "corporate"],
        "narrative": (
            "<h2>What Was Hidden</h2>"
            "<p>Comparison of the published regulatory submission against the "
            "raw trial data repository reveals 847 adverse events were "
            "not disclosed in the final safety review.</p>"
        ),
        "evidence": [
            {
                "media_type": "image",
                "source_url": "https://picsum.photos/seed/pharma/800/450",
                "thumbnail_url": "https://picsum.photos/seed/pharma/800/450",
                "caption": "Side-by-side comparison of disclosed vs. actual AEs",
                "display_order": 0,
            },
        ],
        "interactions": [
            ("alice", "upvote"),
            ("bob", "upvote"),
        ],
    },
    {
        "title": "The Port Authority Corruption Files",
        "slug": "old-corruption-case",
        "summary": (
            "A 3-year investigation into bribery and contract rigging "
            "at a major metropolitan port authority."
        ),
        "creator": "alice",
        "status": "published",
        "start_date": date.today() - timedelta(days=30),
        "age_hours": 72,
        "topics": ["politics", "corporate"],
        "narrative": (
            "<h2>The Kickback Network</h2>"
            "<p>Wire transfer records and whistleblower testimony reveal a "
            "systematic kickback scheme involving 14 contractors and 3 elected officials "
            "over a 6-year period, totalling an estimated $18M in misappropriated funds.</p>"
        ),
        "evidence": [
            {
                "media_type": "document",
                "source_url": "https://example.com/port-auth-wires.pdf",
                "caption": "Wire transfer records — whistleblower exhibit A",
                "display_order": 0,
            },
        ],
        "interactions": [
            ("bob", "upvote"),
            ("carol", "upvote"),
            ("dan", "upvote"),
            ("alice", "upvote"),
            ("bob", "share"),
            ("carol", "share"),
            ("dan", "share"),
            ("alice", "comment"),
            ("bob", "comment"),
            ("carol", "comment"),
            ("dan", "comment"),
            ("alice", "share"),
            ("bob", "comment"),
            ("carol", "comment"),
            ("dan", "comment"),
        ],
    },
    {
        "title": "Draft: Social Media Manipulation Networks",
        "slug": "draft-investigation",
        "summary": "Ongoing investigation — not yet ready for publication.",
        "creator": "alice",
        "status": "draft",
        "start_date": date.today(),
        "age_hours": 0,
        "topics": ["media"],
        "narrative": "<p>Work in progress.</p>",
        "evidence": [],
        "interactions": [],
    },
]


# ---------------------------------------------------------------------------
# Command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = "Seed dev database with test creators, events, and interactions for ranking system testing."

    def handle(self, *args, **options):
        with transaction.atomic():
            self._seed_topics()
            users = self._seed_creators()
            self._seed_events(users)

        self.stdout.write(self.style.SUCCESS("\nDev seed complete. Test accounts:"))
        for c in CREATORS:
            self.stdout.write(f"  @{c['handle']:12}  {c['email']:30}  password: {c['password']}")
        self.stdout.write("")
        self.stdout.write("To log in via the API:")
        self.stdout.write("  POST /api/v1/auth/login  {\"email\": \"alice@clarity.dev\", \"password\": \"testpass123\"}")

    # -----------------------------------------------------------------------

    def _seed_topics(self):
        """Run seed_global_topics inline (idempotent)."""
        from django.core.management import call_command
        call_command("seed_global_topics", verbosity=0)
        self.stdout.write("  ✓ Topics")

    def _seed_creators(self) -> dict[str, User]:
        users: dict[str, User] = {}
        for data in CREATORS:
            user, created = User.objects.get_or_create(
                email=data["email"],
                defaults={"is_active": True},
            )
            if created:
                user.set_password(data["password"])
                # Back-date the account so confidence scoring is meaningful
                user.date_joined = timezone.now() - timedelta(days=data["account_age_days"])
                user.save()

            profile, _ = CreatorProfile.objects.get_or_create(
                user=user,
                defaults={
                    "handle": data["handle"],
                    "display_name": data["display_name"],
                    "bio": data["bio"],
                    "avatar_url": data["avatar_url"],
                    "is_verified": data["is_verified"],
                },
            )

            # Assign curated topics
            if data["topics"]:
                topic_objs = Topic.objects.filter(slug__in=data["topics"])
                profile.topics.set(topic_objs)

            users[data["handle"]] = user
        self.stdout.write(f"  ✓ Creators ({len(users)} accounts)")
        return users

    def _seed_events(self, users: dict[str, User]):
        seeded = 0
        for data in EVENTS:
            creator = users[data["creator"]]

            event, created = Event.objects.get_or_create(
                slug=data["slug"],
                defaults={
                    "title": data["title"],
                    "summary": data["summary"],
                    "lead_investigator": creator,
                    "status": data["status"],
                    "start_date": data["start_date"],
                },
            )

            if not created:
                continue  # already exists, skip

            # Back-date the event
            if data["age_hours"] > 0:
                Event.objects.filter(pk=event.pk).update(
                    created_at=timezone.now() - timedelta(hours=data["age_hours"])
                )
                event.refresh_from_db()

            # Assign topics
            topic_objs = Topic.objects.filter(slug__in=data.get("topics", []))
            event.topics.set(topic_objs)

            # Narrative
            if data.get("narrative"):
                Narrative.objects.create(
                    event=event,
                    content=data["narrative"],
                    is_published=(data["status"] == "published"),
                )

            # Evidence
            for ev_data in data.get("evidence", []):
                Evidence.objects.create(event=event, **ev_data)

            # Interactions — skip duplicates silently
            for handle, itype in data.get("interactions", []):
                interactor = users.get(handle)
                if not interactor:
                    continue
                Interaction.objects.get_or_create(
                    user=interactor,
                    event=event,
                    interaction_type=itype,
                )

            # Recalculate the trending score now that interactions are in
            TrendingScoreService.update_event_score(event)
            seeded += 1

        self.stdout.write(f"  ✓ Events ({seeded} new)")
        self._print_ranking_preview()

    def _print_ranking_preview(self):
        """Print the current feed order so the user can immediately verify ranking."""
        self.stdout.write("\n  Current trending feed order:")
        events = (
            Event.objects.filter(status="published")
            .order_by("-trending_score", "-created_at")
            .values("slug", "trending_score")
        )
        for i, ev in enumerate(events, 1):
            self.stdout.write(f"    {i}. {ev['slug']:<35}  score: {ev['trending_score']:.4f}")
