"""
Management command: import_csv_data

Imports users, events, and interactions from three CSV files.

Usage:
    uv run python manage.py import_csv_data \\
        --users    /path/to/users.csv \\
        --events   /path/to/events.csv \\
        --interactions /path/to/interactions.csv

Column contracts
----------------
users.csv (no header):
    handle, email, password, display_name, bio, avatar_url,
    is_verified, account_age_days, topic_slugs (pipe-separated)

events.csv (no header):
    slug, title, summary, status, start_date, author_handle,
    topic_slugs (pipe-separated), narrative_html, age_hours

interactions.csv (no header):
    event_slug, user_handle, interaction_type

All imports are idempotent — re-running skips already-existing rows.
"""
from __future__ import annotations

import csv
import sys
from datetime import date, timedelta
from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.events.models import Event, Narrative
from apps.feeds.models import Interaction
from apps.feeds.services.scoring import TrendingScoreService
from apps.topics.models import Topic
from apps.users.models import CreatorProfile, User


def _open(path: str):
    return open(path, newline="", encoding="utf-8-sig")


def _bool(val: str) -> bool:
    return val.strip().lower() in ("true", "1", "yes")


class Command(BaseCommand):
    help = "Import users, events, and interactions from CSV files."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--users", required=True)
        parser.add_argument("--events", required=True)
        parser.add_argument("--interactions", required=True)

    # ------------------------------------------------------------------

    def handle(self, *args, **options):
        users_path = options["users"]
        events_path = options["events"]
        interactions_path = options["interactions"]

        for p in (users_path, events_path, interactions_path):
            if not Path(p).exists():
                self.stderr.write(self.style.ERROR(f"File not found: {p}"))
                sys.exit(1)

        self._import_users(users_path)
        self._import_events(events_path)
        self._import_interactions(interactions_path)
        self._recalculate_scores()

    # ------------------------------------------------------------------
    # 1. Users
    # ------------------------------------------------------------------

    def _import_users(self, path: str) -> None:
        created_users = 0
        created_profiles = 0
        skipped = 0

        with _open(path) as f:
            reader = csv.reader(f)
            for lineno, row in enumerate(reader, 1):
                if not any(row):
                    continue  # blank line
                if len(row) < 9:
                    self.stderr.write(
                        f"  users.csv line {lineno}: expected 9 columns, got {len(row)} — skipping"
                    )
                    continue

                (
                    handle, email, password, display_name, bio,
                    avatar_url, is_verified_raw, account_age_days_raw, topic_slugs_raw,
                ) = [c.strip() for c in row[:9]]

                try:
                    account_age_days = int(float(account_age_days_raw))
                except ValueError:
                    account_age_days = 0

                is_verified = _bool(is_verified_raw)
                topic_slugs = [s.strip() for s in topic_slugs_raw.split("|") if s.strip()]

                with transaction.atomic():
                    # User
                    user, u_created = User.objects.get_or_create(
                        email=email.lower(),
                        defaults={"is_active": True},
                    )
                    if u_created:
                        user.set_password(password)
                        user.date_joined = timezone.now() - timedelta(days=account_age_days)
                        user.save()
                        created_users += 1
                    else:
                        skipped += 1

                    # CreatorProfile
                    profile, p_created = CreatorProfile.objects.get_or_create(
                        user=user,
                        defaults={
                            "handle": handle,
                            "display_name": display_name,
                            "bio": bio,
                            "avatar_url": avatar_url or f"https://i.pravatar.cc/150?u={handle}",
                            "is_verified": is_verified,
                        },
                    )
                    if p_created:
                        created_profiles += 1

                    # Topics
                    if topic_slugs:
                        topics = Topic.objects.filter(slug__in=topic_slugs)
                        profile.topics.set(topics)

        self.stdout.write(
            f"  ✓ Users: {created_users} created, {skipped} already existed"
        )

    # ------------------------------------------------------------------
    # 2. Events
    # ------------------------------------------------------------------

    def _import_events(self, path: str) -> None:
        created = 0
        skipped = 0
        errors = 0

        with _open(path) as f:
            reader = csv.reader(f)
            for lineno, row in enumerate(reader, 1):
                if not any(row):
                    continue
                if len(row) < 9:
                    self.stderr.write(
                        f"  events.csv line {lineno}: expected 9 columns, got {len(row)} — skipping"
                    )
                    errors += 1
                    continue

                (
                    slug, title, summary, status, start_date_raw,
                    author_handle, topic_slugs_raw, narrative_html, age_hours_raw,
                ) = [c.strip() for c in row[:9]]

                # Normalise slug
                slug = slug[:220] or slugify(title)[:220]
                if not slug:
                    errors += 1
                    continue

                # Resolve author
                try:
                    profile = CreatorProfile.objects.select_related("user").get(handle=author_handle)
                    author = profile.user
                except CreatorProfile.DoesNotExist:
                    self.stderr.write(
                        f"  events.csv line {lineno}: unknown handle '{author_handle}' — skipping"
                    )
                    errors += 1
                    continue

                # Parse dates
                try:
                    start_date = date.fromisoformat(start_date_raw)
                except ValueError:
                    start_date = date.today()

                try:
                    age_hours = float(age_hours_raw)
                except ValueError:
                    age_hours = 0.0

                # Validate status
                if status not in ("published", "draft", "archived"):
                    status = "published"

                topic_slugs = [s.strip() for s in topic_slugs_raw.split("|") if s.strip()]

                with transaction.atomic():
                    if Event.objects.filter(slug=slug).exists():
                        skipped += 1
                        continue

                    event = Event.objects.create(
                        slug=slug,
                        title=title,
                        summary=summary[:1000] if summary else "",
                        status=status,
                        start_date=start_date,
                        lead_investigator=author,
                    )

                    # Back-date created_at for time-decay testing
                    if age_hours > 0:
                        Event.objects.filter(pk=event.pk).update(
                            created_at=timezone.now() - timedelta(hours=age_hours)
                        )

                    # Topics
                    if topic_slugs:
                        topics = Topic.objects.filter(slug__in=topic_slugs)
                        event.topics.set(topics)

                    # Narrative
                    if narrative_html:
                        Narrative.objects.create(
                            event=event,
                            content=narrative_html,
                            is_published=(status == "published"),
                        )

                    created += 1

        self.stdout.write(
            f"  ✓ Events: {created} created, {skipped} already existed, {errors} errors"
        )

    # ------------------------------------------------------------------
    # 3. Interactions
    # ------------------------------------------------------------------

    def _import_interactions(self, path: str) -> None:
        created = 0
        skipped = 0
        errors = 0

        # Cache lookups to avoid N+1 queries
        handle_to_user: dict[str, User] = {
            p.handle: p.user
            for p in CreatorProfile.objects.select_related("user").all()
        }
        slug_to_event: dict[str, Event] = {
            e.slug: e for e in Event.objects.all()
        }
        valid_types = {t.value for t in Interaction.InteractionType}

        with _open(path) as f:
            reader = csv.reader(f)
            for lineno, row in enumerate(reader, 1):
                if not any(row):
                    continue
                if len(row) < 3:
                    errors += 1
                    continue

                event_slug, user_handle, interaction_type = [c.strip() for c in row[:3]]

                event = slug_to_event.get(event_slug)
                user = handle_to_user.get(user_handle)

                if not event:
                    errors += 1
                    continue
                if not user:
                    errors += 1
                    continue
                if interaction_type not in valid_types:
                    errors += 1
                    continue
                # Skip self-interactions
                if event.lead_investigator_id == user.pk:
                    skipped += 1
                    continue

                _, was_created = Interaction.objects.get_or_create(
                    user=user,
                    event=event,
                    interaction_type=interaction_type,
                )
                if was_created:
                    created += 1
                else:
                    skipped += 1

        self.stdout.write(
            f"  ✓ Interactions: {created} created, {skipped} skipped, {errors} errors"
        )

    # ------------------------------------------------------------------
    # 4. Recalculate trending scores
    # ------------------------------------------------------------------

    def _recalculate_scores(self) -> None:
        events = Event.objects.filter(status="published")
        count = 0
        for event in events:
            TrendingScoreService.update_event_score(event)
            count += 1
        self.stdout.write(f"  ✓ Trending scores recalculated for {count} published events")
