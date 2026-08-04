"""Approval Pydantic schemas."""

from typing import Optional, List
from pydantic import BaseModel, Field

class ApprovalCreate(BaseModel):
    title: str = Field(..., min_length=3, description="Title of the approval request (min 3 characters)")
    description: str = Field(..., min_length=5, description="Detailed description (min 5 characters)")

class ApprovalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, description="Updated title (min 3 characters)")
    description: Optional[str] = Field(None, min_length=5, description="Updated description (min 5 characters)")

class ApprovalResponse(BaseModel):
    id: str
    title: str
    description: str
    requesterId: str
    status: str
    createdAt: str
    updatedAt: str

class PaginationMeta(BaseModel):
    total: int
    page: int
    pageSize: int
    totalPages: int

class ApprovalListResponseData(BaseModel):
    approvals: List[ApprovalResponse]
    pagination: PaginationMeta
