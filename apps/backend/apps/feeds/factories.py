import factory

from apps.events.factories import EventFactory
from apps.feeds.models import Interaction
from apps.users.factories import UserFactory


class InteractionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Interaction

    user = factory.SubFactory(UserFactory)
    event = factory.SubFactory(EventFactory)
    interaction_type = Interaction.InteractionType.UPVOTE
