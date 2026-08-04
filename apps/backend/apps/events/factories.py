import factory
from django.utils import timezone

from apps.events.models import Event, Evidence, Narrative
from apps.users.factories import UserFactory


class EventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Event

    title = factory.Faker('sentence')
    slug = factory.Sequence(lambda n: f"event-slug-{n}")
    start_date = factory.LazyFunction(timezone.now)
    status = "draft"
    lead_investigator = factory.SubFactory(UserFactory)

class NarrativeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Narrative

    event = factory.SubFactory(EventFactory)
    content = factory.Faker('text')
    is_published = False

class EvidenceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Evidence

    event = factory.SubFactory(EventFactory)
    media_type = "image"
    source_url = factory.Faker('url')
    display_order = 0
