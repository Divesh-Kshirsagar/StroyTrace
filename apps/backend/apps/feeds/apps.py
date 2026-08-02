from django.apps import AppConfig


class FeedsConfig(AppConfig):
    name = 'apps.feeds'

    def ready(self) -> None:
        import apps.feeds.signals  # noqa: F401  — registers signal handlers
