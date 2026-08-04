"""Health check endpoint."""

import time
from datetime import datetime, timezone
from fastapi import APIRouter, Request
from app.core.responses import format_success_response

router = APIRouter()
start_time = time.time()

@router.get("/health", summary="API Health Check")
async def health_check(request: Request):
    """GET /api/v1/health - Public health check status."""
    uptime = round(time.time() - start_time, 2)
    health_data = {
        "status": "UP",
        "uptime": f"{uptime}s",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    return format_success_response(
        message="Approval Management API is up and running healthy.",
        data=health_data,
        request=request,
    )
