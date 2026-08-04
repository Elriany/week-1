"""Authentication API Endpoints."""

from fastapi import APIRouter, Request, HTTPException, status
from app.schemas.auth import LoginRequest
from app.data.users_data import users
from app.core.security import verify_password, create_access_token
from app.core.responses import format_success_response
from app.config.constants import Messages

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", summary="User Login")
async def login(credentials: LoginRequest, request: Request):
    """Authenticate user credentials and return JWT Bearer token."""
    email = credentials.email.lower()
    user = next((u for u in users if u["email"].lower() == email), None)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User with provided email does not exist.",
        )

    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password is incorrect.",
        )

    token_payload = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
    }
    token = create_access_token(token_payload)

    user_info = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "createdAt": user["createdAt"],
    }

    data = {
        "token": token,
        "tokenType": "Bearer",
        "user": user_info,
    }

    return format_success_response(
        message=Messages.LOGIN_SUCCESS,
        data=data,
        request=request,
    )
