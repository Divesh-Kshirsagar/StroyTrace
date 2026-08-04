import jwt
from django.conf import settings
from ninja.errors import HttpError
from ninja.security import HttpBearer

from apps.users.models import User


class AuthBearer(HttpBearer):
    def authenticate(self, request, token):
        try:
            decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            if decoded.get("type") != "access":
                raise HttpError(401, "Invalid token type")
            
            user = User.objects.get(id=decoded.get("user_id"), is_active=True)
            return user
        except jwt.ExpiredSignatureError:
            raise HttpError(401, "Access token expired")
        except (jwt.InvalidTokenError, User.DoesNotExist):
            raise HttpError(401, "Invalid or missing token")


class OptionalAuthBearer(HttpBearer):
    """Returns the user if authenticated, or None for anonymous requests.
    Use this for endpoints that serve both authenticated and anonymous users.

    Django Ninja's HttpBearer treats a None return as "unauthenticated" and
    emits a 401.  We override `__call__` to short-circuit that behaviour:
    if no Authorization header is present at all, we set request.auth = None
    and allow the request through.
    """
    openapi_security_scheme_name = "OptionalBearer"

    def __call__(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header:
            request.auth = None
            return None  # no token → allow through as anonymous
        return super().__call__(request)

    def authenticate(self, request, token):
        if not token:
            return None
        try:
            decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            if decoded.get("type") != "access":
                return None
            user = User.objects.get(id=decoded.get("user_id"), is_active=True)
            return user
        except Exception:
            return None
