"""FastAPI Approval Management API main entrypoint."""

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config.constants import API_PREFIX
from app.config.settings import settings
from app.api.v1.router import api_router
from app.middleware.correlation import CorrelationIdMiddleware
from app.middleware.logging_mw import RequestLoggingMiddleware
from app.core.responses import format_error_response
from app.core.logging import logger

app = FastAPI(
    title="Approval Management API (Python FastAPI)",
    description="Python FastAPI REST API for Approval Management with JWT Auth, RBAC, Swagger & OpenAPI docs.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Register Middlewares
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router, prefix=API_PREFIX)

# Custom Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Formats HTTPExceptions into standard JSON error envelope."""
    payload = format_error_response(
        message=str(exc.detail),
        status_code=exc.status_code,
        request=request,
    )
    return JSONResponse(status_code=exc.status_code, content=payload)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats Pydantic validation errors while retaining FastAPI native 422 HTTP status."""
    formatted_errors = []
    for err in exc.errors():
        field_path = " -> ".join([str(loc) for loc in err.get("loc", []) if loc != "body"])
        formatted_errors.append({
            "field": field_path or "body",
            "message": err.get("msg"),
            "type": err.get("type"),
        })

    payload = format_error_response(
        message="Validation failed. Please check input parameters.",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        errors=formatted_errors,
        request=request,
    )
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=payload)

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Fallback handler for unhandled operational exceptions."""
    logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
    payload = format_error_response(
        message="An internal server error occurred.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        request=request,
    )
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=payload)
