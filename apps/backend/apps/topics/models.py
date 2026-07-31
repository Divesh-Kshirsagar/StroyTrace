from django.db import models
import uuid

class Topic(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, null=True)

class CreatorTopic(models.Model):
    creator_profile = models.ForeignKey('users.CreatorProfile', on_delete=models.CASCADE, related_name="topics")
    topic = models.ForeignKey('topics.Topic', on_delete=models.CASCADE, related_name="creators")
    class Meta:
        unique_together = ('creator_profile', 'topic')
