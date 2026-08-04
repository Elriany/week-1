"""Users API Endpoints."""

from typing import Dict, Any
from fastapi import APIRouter, Request, Depends, HTTPException, status
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_roles
from app.config.constants import Roles, Messages
from app.data.users_data import users
from app.core.responses import format_success_response

router = APIRouter(prefix="/users", tags=["Users"])

def sanitize_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """Strip sensitive fields like password from user dict."""
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "createdAt": user["createdAt"],
    }

@router.get("", summary="Get all users")
async def get_all_users(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_roles(Roles.ADMIN, Roles.MANAGER)),
):
    """Retrieve list of all registered users (Admin & Manager only)."""
    sanitized = [sanitize_user(u) for u in users]
    return format_success_response(
        message=Messages.USERS_RETRIEVED,
        data=sanitized,
        request=request,
    )

@router.get("/{user_id}", summary="Get user by ID")
async def get_user_by_id(
    user_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieve details for a specific user."""
    if current_user["role"] == Roles.EMPLOYEE and current_user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Employees can only view their own user profile.",
        )

    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' not found.",
        )

    return format_success_response(
        message=Messages.USER_RETRIEVED,
        data=sanitize_user(user),
        request=request,
    )
