import base64
from datetime import datetime
from typing import Optional, Tuple
from django.db.models import QuerySet, Q


def encode_cursor(value: str, pk: str) -> str:
    """Encode a sort value + pk into an opaque cursor string."""
    cursor_str = f"{value}|{pk}"
    return base64.b64encode(cursor_str.encode('utf-8')).decode('utf-8')


def decode_cursor(cursor: str) -> Tuple[Optional[str], Optional[str]]:
    try:
        decoded = base64.b64decode(cursor.encode('utf-8')).decode('utf-8')
        value, pk = decoded.split('|', 1)
        return value, pk
    except Exception:
        return None, None


def paginate_queryset(
    qs: QuerySet,
    cursor: Optional[str],
    limit: int = 20,
    sort: str = "latest",
) -> dict:
    """
    Cursor-based pagination that respects the requested sort order.

    sort="latest"   — ordered by created_at DESC  (cursor encodes timestamp)
    sort="trending" — ordered by trending_score DESC, created_at DESC
                      (cursor encodes score|timestamp so both fields are stable)
    """
    if sort == "trending":
        qs = qs.order_by('-trending_score', '-created_at', '-id')
    else:
        qs = qs.order_by('-created_at', '-id')

    if cursor:
        value, pk = decode_cursor(cursor)
        if value and pk:
            if sort == "trending":
                # value is "score|timestamp"
                try:
                    score_str, ts_str = value.split('~', 1)
                    score = float(score_str)
                    ts = datetime.fromtimestamp(float(ts_str))
                    qs = qs.filter(
                        Q(trending_score__lt=score)
                        | Q(trending_score=score, created_at__lt=ts)
                        | Q(trending_score=score, created_at=ts, id__lt=pk)
                    )
                except (ValueError, TypeError):
                    pass
            else:
                try:
                    ts = datetime.fromtimestamp(float(value))
                    qs = qs.filter(
                        Q(created_at__lt=ts)
                        | Q(created_at=ts, id__lt=pk)
                    )
                except (ValueError, TypeError):
                    pass

    items = list(qs[:limit + 1])
    has_next = len(items) > limit

    if has_next:
        items = items[:limit]

    next_cursor = None
    if has_next and items:
        last = items[-1]
        if sort == "trending":
            cursor_value = f"{last.trending_score}~{last.created_at.timestamp()}"
        else:
            cursor_value = str(last.created_at.timestamp())
        next_cursor = encode_cursor(cursor_value, str(last.id))

    return {
        "items": items,
        "next_cursor": next_cursor,
        "previous_cursor": None,
        "has_next": has_next,
    }
