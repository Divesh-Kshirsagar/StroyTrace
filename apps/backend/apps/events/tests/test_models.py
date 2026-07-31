import pytest
from apps.events.factories import EventFactory, NarrativeFactory, EvidenceFactory

@pytest.mark.django_db
def test_event_creation():
    event = EventFactory(title="Test Event")
    assert event.title == "Test Event"
    assert event.status == "draft"
    assert event.lead_investigator is not None

@pytest.mark.django_db
def test_narrative_creation():
    narrative = NarrativeFactory(content="<p>Test</p>")
    assert narrative.content == "<p>Test</p>"
    assert narrative.event is not None

@pytest.mark.django_db
def test_evidence_creation():
    evidence = EvidenceFactory(source_url="http://example.com")
    assert evidence.source_url == "http://example.com"
    assert evidence.event is not None
