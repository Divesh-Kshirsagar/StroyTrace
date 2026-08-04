from django.contrib import admin

from .models import Event, Evidence, Narrative


class EvidenceInline(admin.TabularInline):
    model = Evidence
    extra = 1

class NarrativeInline(admin.StackedInline):
    model = Narrative
    max_num = 1

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'lead_investigator', 'status', 'start_date', 'created_at')
    list_filter = ('status', 'start_date', 'created_at')
    search_fields = ('title', 'summary', 'slug')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [NarrativeInline, EvidenceInline]
    date_hierarchy = 'created_at'

@admin.register(Narrative)
class NarrativeAdmin(admin.ModelAdmin):
    list_display = ('event', 'is_published', 'updated_at')
    list_filter = ('is_published',)
    search_fields = ('content',)

@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = ('event', 'media_type', 'source_url', 'display_order')
    list_filter = ('media_type',)
    search_fields = ('caption', 'source_url')
