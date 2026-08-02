"""
Management command: seed_global_topics
Idempotent — safe to run multiple times.
Creates the standard global topic taxonomy.
"""
from django.core.management.base import BaseCommand

from apps.topics.models import Topic

TOPICS = [
    ("Politics", "politics", "Government, elections, policy, and political movements."),
    ("Technology", "technology", "Big Tech, AI, cybersecurity, and digital rights."),
    ("Environment", "environment", "Climate, pollution, biodiversity, and sustainability."),
    ("Health", "health", "Public health, pharmaceuticals, and medical research."),
    ("Finance", "finance", "Markets, banking, crypto, and economic policy."),
    ("Human Rights", "human-rights", "Civil liberties, activism, and social justice."),
    ("Science", "science", "Research integrity, space, and scientific institutions."),
    ("Media", "media", "Journalism, disinformation, and press freedom."),
    ("War & Conflict", "war-conflict", "Armed conflicts, arms trade, and international security."),
    ("Corporate", "corporate", "Business practices, lobbying, and corporate accountability."),
]


class Command(BaseCommand):
    help = "Seed global topics taxonomy (idempotent)."

    def handle(self, *args, **options):
        created = 0
        for name, slug, description in TOPICS:
            _, was_created = Topic.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "description": description},
            )
            if was_created:
                created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Topics seeded. {created} new, {len(TOPICS) - created} already existed."
            )
        )
