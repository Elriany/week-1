"""FastAPI Role-Based Access Control (RBAC) dependency factory."""

from typing import Callable, List, Dict, Any
from fastapi import Depends, HTTPException, status
from app.dependencies.auth import get_current_user

def require_roles(*allowed_roles: str) -> Callable:
    """Dependency factory returning a function that verifies current user has one of allowed_roles."""
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Insufficient permissions."
            )
        return current_user

    return role_checker
