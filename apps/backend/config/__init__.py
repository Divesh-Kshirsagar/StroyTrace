# This ensures the app is always imported when Django starts so that
# shared_task decorators use this Celery app.
from .celery import app as celery_app

__all__ = ("celery_app",)
