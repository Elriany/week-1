"""User Pydantic schemas."""

from pydantic import BaseModel

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    createdAt: str
