"""Standardized JSON response envelope builder matching Week 1 contract."""

from datetime import datetime, timezone
from typing import Any, Optional, Dict
from fastapi import Request
from app.config.constants import API_VERSION

def create_meta(request: Optional[Request] = None) -> Dict[str, Any]:
    """Generates standard metadata block."""
    correlation_id = "N/A"
    if request and hasattr(request.state, "correlation_id"):
        correlation_id = request.state.correlation_id

    return {
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "correlationId": correlation_id,
        "version": API_VERSION,
    }

def format_success_response(
    message: str,
    data: Optional[Any] = None,
    request: Optional[Request] = None,
) -> Dict[str, Any]:
    """Formats a standardized success response dictionary."""
    response = {
        "success": True,
        "message": message,
    }
    if data is not None:
        response["data"] = data
    response["meta"] = create_meta(request)
    return response

def format_error_response(
    message: str,
    status_code: int,
    errors: Optional[Any] = None,
    request: Optional[Request] = None,
) -> Dict[str, Any]:
    """Formats a standardized error response dictionary."""
    response = {
        "success": False,
        "status": status_code,
        "message": message,
    }
    if errors is not None and len(errors) > 0:
        response["errors"] = errors
    response["meta"] = create_meta(request)
    return response
