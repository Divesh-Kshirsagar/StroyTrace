from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, CreatorProfile

class CreatorProfileInline(admin.StackedInline):
    model = CreatorProfile
    can_delete = False
    verbose_name_plural = 'Creator Profile'
    filter_horizontal = ('topics',)

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'is_staff', 'is_active', 'date_joined')
    search_fields = ('email',)
    ordering = ('-date_joined',)
    inlines = (CreatorProfileInline,)

@admin.register(CreatorProfile)
class CreatorProfileAdmin(admin.ModelAdmin):
    list_display = ('handle', 'display_name', 'user', 'is_verified')
    list_filter = ('is_verified',)
    search_fields = ('handle', 'display_name', 'bio')
    filter_horizontal = ('topics',)
