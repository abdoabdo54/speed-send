"""
Middleware for production optimizations
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging
import uuid

logger = logging.getLogger(__name__)


class PerformanceMiddleware(BaseHTTPMiddleware):
    """Structured timing + request ID logging"""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.time()
        try:
            response = await call_next(request)
        finally:
            process_time = (time.time() - start_time) * 1000.0
            logger.info(
                {
                    "event": "request_finished",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": getattr(locals().get('response', None), 'status_code', None),
                    "duration_ms": round(process_time, 2),
                }
            )
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Request-ID"] = request_id
        return response

