"""
Root conftest for the Clarity backend test suite.

IMPORTANT: The R2 env vars are set via pytest_configure — the earliest possible
hook — so that the required django-environ calls in config.settings.base don't
raise ImproperlyConfigured during test collection. These are placeholder values;
actual R2 interaction in tests must use moto to mock the S3/R2 client.
"""

import os


def pytest_configure(config):
    """Set required environment variables before Django settings are loaded."""
    os.environ.setdefault("R2_ENDPOINT_URL", "https://test.r2.cloudflarestorage.com")
    os.environ.setdefault("R2_ACCESS_KEY_ID", "test-access-key-id")
    os.environ.setdefault("R2_SECRET_ACCESS_KEY", "test-secret-access-key")


import pytest
from django.test import Client


@pytest.fixture
def api_client():
    return Client()
