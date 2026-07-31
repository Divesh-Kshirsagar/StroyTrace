import pytest
from apps.topics.factories import TopicFactory

@pytest.mark.django_db
def test_topic_creation():
    topic = TopicFactory(name="Test Topic")
    assert topic.name == "Test Topic"
    assert "topic" in topic.slug
