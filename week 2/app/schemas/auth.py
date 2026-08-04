"""Authentication Pydantic schemas."""

from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=1, description="User's password")

class UserPublicInfo(BaseModel):
    id: str
    name: str
    email: str
    role: str
    createdAt: str

class LoginResponseData(BaseModel):
    token: str
    tokenType: str = "Bearer"
    user: UserPublicInfo
