import pytest
from apps.users.factories import UserFactory, CreatorProfileFactory

@pytest.mark.django_db
def test_user_creation():
    user = UserFactory(email="test@example.com")
    assert user.email == "test@example.com"
    assert user.is_active is True

@pytest.mark.django_db
def test_creator_profile_creation():
    profile = CreatorProfileFactory(handle="tester")
    assert profile.handle == "tester"
    assert profile.user.email is not None
