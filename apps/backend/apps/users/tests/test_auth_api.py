import pytest
from django.contrib.auth import get_user_model

from apps.users.factories import CreatorProfileFactory

User = get_user_model()

@pytest.mark.django_db
def test_login_success(api_client):
    profile = CreatorProfileFactory(user__email="test@example.com")
    user = profile.user
    user.set_password("testpass123")
    user.save()
    
    response = api_client.post('/api/v1/auth/login', data={
        "email": "test@example.com",
        "password": "testpass123"
    }, content_type="application/json")
    
    assert response.status_code == 200
    assert "access_token" in response.json()

@pytest.mark.django_db
def test_login_failure(api_client):
    response = api_client.post('/api/v1/auth/login', data={
        "email": "wrong@example.com",
        "password": "wrong"
    }, content_type="application/json")
    
    # Can be 401 Unauthorized or RateLimited (429) if we hit it too fast, but this is the first try
    assert response.status_code in [401, 429]

@pytest.mark.django_db
def test_me_unauthenticated(api_client):
    response = api_client.get('/api/v1/auth/me')
    assert response.status_code == 401
