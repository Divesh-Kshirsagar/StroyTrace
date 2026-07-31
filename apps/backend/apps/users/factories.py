import factory
from django.contrib.auth import get_user_model
from apps.users.models import CreatorProfile

User = get_user_model()

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')
    is_active = True

class CreatorProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CreatorProfile

    user = factory.SubFactory(UserFactory)
    handle = factory.Sequence(lambda n: f"creator{n}")
    display_name = factory.Faker('name')
    bio = factory.Faker('text')
    is_verified = False
