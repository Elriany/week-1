"""Standardized Response Envelope Schema for OpenAPI doc clarity."""

from typing import Optional, Any, Dict
from pydantic import BaseModel

class ResponseMeta(BaseModel):
    timestamp: str
    correlationId: str
    version: str

class StandardEnvelope(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
    meta: ResponseMeta
