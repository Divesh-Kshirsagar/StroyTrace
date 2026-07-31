import pytest
from apps.events.factories import EventFactory
from apps.users.factories import CreatorProfileFactory

@pytest.mark.django_db
def test_search_events(api_client):
    profile = CreatorProfileFactory(handle="testinvestigator")
    event1 = EventFactory(title="Test Event Alpha", status="published", lead_investigator=profile.user)
    event2 = EventFactory(title="Test Event Beta", status="draft", lead_investigator=profile.user)

    response = api_client.get('/api/v1/events/search?q=Alpha')
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    # Only published events should be returned in public search by default unless filtered
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Test Event Alpha"
