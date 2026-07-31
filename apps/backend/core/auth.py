from ninja.security import HttpBearer
from ninja.errors import HttpError
from django.conf import settings
import jwt
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
