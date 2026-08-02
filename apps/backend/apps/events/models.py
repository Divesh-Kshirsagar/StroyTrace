import uuid
from django.db import models
from django.conf import settings
from apps.topics.models import Topic

class Event(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    summary = models.TextField(max_length=1000, blank=True, null=True)
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    lead_investigator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='events',
        db_index=True
    )
    topics = models.ManyToManyField(Topic, related_name='events', blank=True)

    # Ranking fields — updated asynchronously by the scoring worker
    trending_score = models.FloatField(default=0.0, db_index=True)
    last_interaction_at = models.DateTimeField(null=True, blank=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['-trending_score']),
            models.Index(fields=['-last_interaction_at']),
        ]

    def __str__(self):
        return self.title

class Narrative(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.OneToOneField(
        Event,
        on_delete=models.CASCADE,
        related_name='narrative'
    )
    content = models.TextField()
    is_published = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Narrative for {self.event.title}"

class Evidence(models.Model):
    MEDIA_CHOICES = [
        ('youtube', 'YouTube'),
        ('instagram', 'Instagram'),
        ('image', 'Image'),
        ('document', 'Document'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='evidence_set'
    )
    media_type = models.CharField(max_length=20, choices=MEDIA_CHOICES, db_index=True)
    source_url = models.URLField(max_length=1000)
    thumbnail_url = models.URLField(max_length=1000, blank=True, null=True)
    caption = models.CharField(max_length=500, blank=True, null=True)
    display_order = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['event', 'display_order']),
        ]
        ordering = ['display_order', 'created_at']

    def __str__(self):
        return f"Evidence {self.media_type} for {self.event.title}"
