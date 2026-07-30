from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)

class CreatorProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="creator_profile")
    handle = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=200)
    bio = models.TextField(blank=True, null=True)
    avatar_url = models.URLField(blank=True, null=True)
    banner_url = models.URLField(blank=True, null=True)
    social_links = models.JSONField(default=dict)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"@{self.handle}"

class Topic(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class CreatorTopic(models.Model):
    creator_profile = models.ForeignKey(CreatorProfile, on_delete=models.CASCADE, related_name="topics")
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name="creators")

    class Meta:
        unique_together = ('creator_profile', 'topic')

class Event(models.Model):
    STATUS_CHOICES = (
        ('ongoing', 'Ongoing'),
        ('resolved', 'Resolved'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    slug = models.SlugField(unique=True)
    summary = models.TextField()
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='ongoing')
    lead_investigator = models.ForeignKey(User, on_delete=models.CASCADE, related_name="events")
    created_at = models.DateTimeField(auto_now_add=True)
    topics = models.ManyToManyField(Topic, related_name="events")

    def __str__(self):
        return self.title

class Narrative(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.OneToOneField(Event, on_delete=models.CASCADE, related_name="narrative")
    content = models.TextField()
    is_published = models.BooleanField(default=False)

class Evidence(models.Model):
    MEDIA_CHOICES = (
        ('youtube', 'YouTube'),
        ('instagram', 'Instagram'),
        ('image', 'Image'),
        ('doc', 'Document'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="evidence")
    media_type = models.CharField(max_length=50, choices=MEDIA_CHOICES)
    source_url = models.URLField()
    thumbnail_url = models.URLField(blank=True, null=True)
    caption = models.CharField(max_length=500, blank=True, null=True)
    display_order = models.IntegerField(default=0)
