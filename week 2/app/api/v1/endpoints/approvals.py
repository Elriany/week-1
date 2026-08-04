"""Approvals API Endpoints."""

import uuid
import math
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, Depends, HTTPException, Query, status
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_roles
from app.config.constants import Roles, ApprovalStatus, Messages
from app.data.approvals_data import approvals
from app.schemas.approval import ApprovalCreate, ApprovalUpdate
from app.core.responses import format_success_response

router = APIRouter(prefix="/approvals", tags=["Approvals"])

@router.get("", summary="Get approvals list")
async def get_all_approvals(
    request: Request,
    requesterId: Optional[str] = Query(None, description="Filter by requester ID (Manager/Admin only)"),
    status_param: Optional[str] = Query(None, alias="status", description="Filter by status (PENDING, APPROVED, REJECTED)"),
    search: Optional[str] = Query(None, description="Search term in title or description"),
    sort: str = Query("createdAt", description="Sort field"),
    sortDirection: str = Query("desc", description="Sort direction (asc or desc)"),
    page: int = Query(1, ge=1, description="Page number"),
    pageSize: int = Query(10, ge=1, description="Items per page"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List approval requests with filtering, search, sorting, and pagination."""
    result = list(approvals)

    # 1. Role Scope Enforcing
    if current_user["role"] == Roles.EMPLOYEE:
        result = [item for item in result if item["requesterId"] == current_user["id"]]
    elif requesterId:
        result = [item for item in result if item["requesterId"] == requesterId]

    # 2. Status Filtering
    if status_param:
        filter_status = status_param.upper()
        result = [item for item in result if item["status"].upper() == filter_status]

    # 3. Search Query
    if search:
        search_term = search.lower()
        result = [
            item for item in result
            if search_term in item["title"].lower() or search_term in item["description"].lower()
        ]

    # 4. Sorting
    is_reverse = sortDirection.lower() == "desc"
    result.sort(key=lambda x: x.get(sort, ""), reverse=is_reverse)

    # 5. Pagination
    total_items = len(result)
    total_pages = math.ceil(total_items / pageSize) if total_items > 0 else 1
    start_index = (page - 1) * pageSize
    paginated_approvals = result[start_index : start_index + pageSize]

    data = {
        "approvals": paginated_approvals,
        "pagination": {
            "total": total_items,
            "page": page,
            "pageSize": pageSize,
            "totalPages": total_pages,
        },
    }

    return format_success_response(
        message=Messages.APPROVALS_RETRIEVED,
        data=data,
        request=request,
    )

@router.get("/{approval_id}", summary="Get approval by ID")
async def get_approval_by_id(
    approval_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get single approval request by ID."""
    approval = next((item for item in approvals if item["id"] == approval_id), None)

    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request with ID '{approval_id}' not found.",
        )

    if current_user["role"] == Roles.EMPLOYEE and approval["requesterId"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You are not authorized to view this approval request.",
        )

    return format_success_response(
        message="Approval request retrieved successfully.",
        data=approval,
        request=request,
    )

@router.post("", summary="Create approval request", status_code=status.HTTP_201_CREATED)
async def create_approval(
    payload: ApprovalCreate,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new approval request."""
    now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    new_approval = {
        "id": f"req-{uuid.uuid4().hex[:8]}",
        "title": payload.title,
        "description": payload.description,
        "requesterId": current_user["id"],
        "status": ApprovalStatus.PENDING,
        "createdAt": now_str,
        "updatedAt": now_str,
    }

    approvals.append(new_approval)

    return format_success_response(
        message=Messages.APPROVAL_CREATED,
        data=new_approval,
        request=request,
    )

@router.put("/{approval_id}", summary="Update approval request")
async def update_approval(
    approval_id: str,
    payload: ApprovalUpdate,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update an existing approval request."""
    approval = next((item for item in approvals if item["id"] == approval_id), None)

    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request with ID '{approval_id}' not found.",
        )

    if current_user["role"] == Roles.EMPLOYEE:
        if approval["requesterId"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only update your own approval requests.",
            )
        if approval["status"] != ApprovalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only update approval requests that are currently PENDING.",
            )

    if payload.title is not None:
        approval["title"] = payload.title
    if payload.description is not None:
        approval["description"] = payload.description

    approval["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return format_success_response(
        message=Messages.APPROVAL_UPDATED,
        data=approval,
        request=request,
    )

@router.delete("/{approval_id}", summary="Delete approval request")
async def delete_approval(
    approval_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete an approval request."""
    index = next((i for i, item in enumerate(approvals) if item["id"] == approval_id), -1)

    if index == -1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request with ID '{approval_id}' not found.",
        )

    approval = approvals[index]

    if current_user["role"] == Roles.EMPLOYEE:
        if approval["requesterId"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only delete your own approval requests.",
            )
        if approval["status"] != ApprovalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only delete approval requests that are currently PENDING.",
            )
    elif current_user["role"] != Roles.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Admins or request owners can delete requests.",
        )

    deleted_approval = approvals.pop(index)

    return format_success_response(
        message=Messages.APPROVAL_DELETED,
        data=deleted_approval,
        request=request,
    )

@router.post("/{approval_id}/approve", summary="Approve approval request")
async def approve_approval(
    approval_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(require_roles(Roles.MANAGER, Roles.ADMIN)),
):
    """Approve an approval request (Manager & Admin only)."""
    approval = next((item for item in approvals if item["id"] == approval_id), None)

    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request with ID '{approval_id}' not found.",
        )

    approval["status"] = ApprovalStatus.APPROVED
    approval["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return format_success_response(
        message=Messages.APPROVAL_APPROVED,
        data=approval,
        request=request,
    )

@router.post("/{approval_id}/reject", summary="Reject approval request")
async def reject_approval(
    approval_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(require_roles(Roles.MANAGER, Roles.ADMIN)),
):
    """Reject an approval request (Manager & Admin only)."""
    approval = next((item for item in approvals if item["id"] == approval_id), None)

    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request with ID '{approval_id}' not found.",
        )

    approval["status"] = ApprovalStatus.REJECTED
    approval["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return format_success_response(
        message=Messages.APPROVAL_REJECTED,
        data=approval,
        request=request,
    )
