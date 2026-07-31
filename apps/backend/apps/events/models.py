from django.db import models
import uuid

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
    lead_investigator = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name="events")
    created_at = models.DateTimeField(auto_now_add=True)
    topics = models.ManyToManyField('topics.Topic', related_name="events")

class Narrative(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.OneToOneField('events.Event', on_delete=models.CASCADE, related_name="narrative")
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
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name="evidence")
    media_type = models.CharField(max_length=50, choices=MEDIA_CHOICES)
    source_url = models.URLField()
    thumbnail_url = models.URLField(blank=True, null=True)
    caption = models.CharField(max_length=500, blank=True, null=True)
    display_order = models.IntegerField(default=0)
