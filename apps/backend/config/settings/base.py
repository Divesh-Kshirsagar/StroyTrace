"""
Django base settings for the Clarity backend.

Reads secrets and configuration from environment variables (or a .env file).
Uses python-decouple for pre-existing settings and django-environ for the
new R2 / Celery settings introduced in the secure-evidence-upload feature.
"""

import os
from pathlib import Path

import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ---------------------------------------------------------------------------
# Environment helpers — support both raw env vars and a .env file
# ---------------------------------------------------------------------------
try:
    from decouple import config
except ImportError:
    # Fallback: read from os.environ only
    def config(key, default=None, cast=str):  # type: ignore
        val = os.environ.get(key)
        if val is None:
            if default is None:
                return default
            if cast is bool and isinstance(default, bool):
                return default
            try:
                return cast(default)
            except (ValueError, TypeError):
                return default
        if cast is bool:
            return val.lower() in ('true', '1', 'yes')
        try:
            return cast(val)
        except (ValueError, TypeError):
            return default

# django-environ instance — reads from os.environ; also reads a .env file
# located at BASE_DIR/.env when present. Falls back to .env.test when no
# production .env exists (e.g., during local development or CI test runs).
env = environ.Env()
_env_file = BASE_DIR / '.env'
_env_test_file = BASE_DIR / '.env.test'
if _env_file.exists():
    environ.Env.read_env(str(_env_file))
elif _env_test_file.exists():
    environ.Env.read_env(str(_env_test_file))

# ---------------------------------------------------------------------------
# Core security
# ---------------------------------------------------------------------------
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')
DEBUG = config('DEBUG', default=True, cast=bool)

_allowed_raw = config('ALLOWED_HOSTS', default='localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in _allowed_raw.split(',') if h.strip()]

# Prevent Django from appending slashes and causing 301 loops with Next.js
APPEND_SLASH = False

# ---------------------------------------------------------------------------
# JWT settings (used in users/routers.py)
# ---------------------------------------------------------------------------
ACCESS_TOKEN_EXPIRE_MINUTES = config('ACCESS_TOKEN_EXPIRE_MINUTES', default=15, cast=int)
REFRESH_TOKEN_EXPIRE_DAYS = config('REFRESH_TOKEN_EXPIRE_DAYS', default=7, cast=int)

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'django_ratelimit',
    'apps.users',
    'apps.topics',
    'apps.events',
    'apps.feeds',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_cors_raw = config('CORS_ALLOWED_ORIGINS', default='http://localhost:3000,http://127.0.0.1:3000')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_raw.split(',') if o.strip()]
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
STATIC_URL = 'static/'

# ---------------------------------------------------------------------------
# Cache — required for django-ratelimit
# In production swap this for Redis: django.core.cache.backends.redis.RedisCache
# ---------------------------------------------------------------------------
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

SILENCED_SYSTEM_CHECKS = ['django_ratelimit.E003', 'django_ratelimit.W001']

# ---------------------------------------------------------------------------
# Auth user model
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = 'users.User'

# ---------------------------------------------------------------------------
# Ranking System Configuration
# Weights sum to 1.0 for the Engagement Confidence Score.
# All values loaded from env vars so production can be tuned without deploys.
# ---------------------------------------------------------------------------
RANKING_WEIGHT_ACCOUNT_AGE = config("RANKING_WEIGHT_ACCOUNT_AGE", default=0.3, cast=float)
RANKING_WEIGHT_VERIFIED = config("RANKING_WEIGHT_VERIFIED", default=0.2, cast=float)
RANKING_WEIGHT_NO_FLAGS = config("RANKING_WEIGHT_NO_FLAGS", default=0.3, cast=float)
RANKING_WEIGHT_PROFILE_COMPLETE = config("RANKING_WEIGHT_PROFILE_COMPLETE", default=0.2, cast=float)

# Time decay (Hacker News-style): score = 1 / (age_hours + base) ^ gravity
RANKING_TIME_DECAY_GRAVITY = config("RANKING_TIME_DECAY_GRAVITY", default=1.8, cast=float)
RANKING_TIME_DECAY_BASE_HOURS = config("RANKING_TIME_DECAY_BASE_HOURS", default=2.0, cast=float)

# Interaction weights
RANKING_WEIGHT_UPVOTE = config("RANKING_WEIGHT_UPVOTE", default=1.0, cast=float)
RANKING_WEIGHT_COMMENT = config("RANKING_WEIGHT_COMMENT", default=1.5, cast=float)
RANKING_WEIGHT_SHARE = config("RANKING_WEIGHT_SHARE", default=2.0, cast=float)

# ---------------------------------------------------------------------------
# Django Ninja / default schema
# ---------------------------------------------------------------------------
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# Cloudflare R2 storage settings
# R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required
# and must be set in the environment — no defaults are provided so Django will
# raise a clear ImproperlyConfigured error if they are missing.
# ---------------------------------------------------------------------------
R2_ENDPOINT_URL = env("R2_ENDPOINT_URL")
R2_ACCESS_KEY_ID = env("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = env("R2_SECRET_ACCESS_KEY")
R2_QUARANTINE_BUCKET = env("R2_QUARANTINE_BUCKET", default="storytrace-quarantine")
R2_PRODUCTION_BUCKET = env("R2_PRODUCTION_BUCKET", default="storytrace-evidence-public")
R2_CDN_DOMAIN = env("R2_CDN_DOMAIN", default="cdn.storytrace.org")

# ---------------------------------------------------------------------------
# Celery settings
# CELERY_BROKER_URL / CELERY_RESULT_BACKEND read from REDIS_URL env var.
# CELERY_TASK_ALWAYS_EAGER=True in tests to run tasks synchronously.
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=False)
