import base64
from datetime import datetime
from typing import Optional, Tuple
from django.db.models import QuerySet, Q

def encode_cursor(created_at: datetime, pk: str) -> str:
    cursor_str = f"{created_at.timestamp()}|{pk}"
    return base64.b64encode(cursor_str.encode('utf-8')).decode('utf-8')

def decode_cursor(cursor: str) -> Tuple[Optional[datetime], Optional[str]]:
    try:
        decoded = base64.b64decode(cursor.encode('utf-8')).decode('utf-8')
        ts_str, pk = decoded.split('|')
        return datetime.fromtimestamp(float(ts_str)), pk
    except Exception:
        return None, None

def paginate_queryset(qs: QuerySet, cursor: Optional[str], limit: int = 20) -> dict:
    # Ensure ordered by created_at DESC, id DESC
    qs = qs.order_by('-created_at', '-id')
    
    if cursor:
        created_at, pk = decode_cursor(cursor)
        if created_at and pk:
            qs = qs.filter(
                Q(created_at__lt=created_at) | 
                (Q(created_at=created_at) & Q(id__lt=pk))
            )
            
    items = list(qs[:limit + 1])
    has_next = len(items) > limit
    
    if has_next:
        items = items[:limit]
        last_item = items[-1]
        next_cursor = encode_cursor(last_item.created_at, str(last_item.id))
    else:
        next_cursor = None
        
    return {
        "items": items,
        "next_cursor": next_cursor,
        "previous_cursor": None,
        "has_next": has_next
    }
