"""
Celery application instance for the Clarity backend.

Django settings module is set to `config.settings.base` (Task 1.4 will create
this module by splitting the current flat `config/settings.py` into a
`config/settings/` package with `base.py` as the primary settings file).

Task 5.3 will add `app.autodiscover_tasks()` once the task modules exist.
"""

import os

from celery import Celery

# Set the default Django settings module for the 'celery' command-line program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

app = Celery("config")

# Use a string here so the worker doesn't have to serialise the configuration
# object to child processes. `namespace='CELERY'` means all Celery-related
# configuration keys in Django settings must start with `CELERY_`.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Automatically discover tasks in all apps listed in INSTALLED_APPS.
# Added in Task 5.3 once the task modules exist.
app.autodiscover_tasks()

