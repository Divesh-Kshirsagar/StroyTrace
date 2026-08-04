import factory

from apps.topics.models import Topic


class TopicFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Topic

    name = factory.Sequence(lambda n: f"Topic {n}")
    slug = factory.Sequence(lambda n: f"topic-{n}")
    description = factory.Faker('text')
