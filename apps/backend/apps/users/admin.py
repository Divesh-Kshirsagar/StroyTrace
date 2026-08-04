from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import CreatorProfile, User


class ClarityUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('email',)


class ClarityUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = ('email', 'is_active', 'is_staff', 'is_superuser', 'password')


class CreatorProfileInline(admin.StackedInline):
    model = CreatorProfile
    can_delete = False
    verbose_name_plural = 'Creator Profile'
    filter_horizontal = ('topics',)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = ClarityUserChangeForm
    add_form = ClarityUserCreationForm

    list_display = ('email', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('is_staff', 'is_active', 'is_superuser')
    search_fields = ('email',)
    ordering = ('-date_joined',)
    inlines = (CreatorProfileInline,)

    # Override the default fieldsets which reference username/first_name/last_name
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )


@admin.register(CreatorProfile)
class CreatorProfileAdmin(admin.ModelAdmin):
    list_display = ('handle', 'display_name', 'user', 'is_verified')
    list_filter = ('is_verified',)
    search_fields = ('handle', 'display_name', 'bio')
    filter_horizontal = ('topics',)
