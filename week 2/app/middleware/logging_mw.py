"""HTTP request latency logger middleware."""

import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.core.logging import logger

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time_ms = round((time.time() - start_time) * 1000, 2)
        correlation_id = getattr(request.state, "correlation_id", "N/A")
        client_ip = request.client.host if request.client else "unknown"

        log_msg = f"[CID:{correlation_id}] {request.method} {request.url.path} | Status: {response.status_code} | Latency: {process_time_ms}ms | IP: {client_ip}"
        logger.info(log_msg)

        return response
