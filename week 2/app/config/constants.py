"""Application Constants matching Week 1 domain model and messages."""

API_PREFIX = "/api/v1"
API_VERSION = "v1"

class Roles:
    ADMIN = "Admin"
    MANAGER = "Manager"
    EMPLOYEE = "Employee"

class ApprovalStatus:
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Messages:
    LOGIN_SUCCESS = "User authenticated successfully."
    LOGIN_FAILED = "Invalid email or password."
    USERS_RETRIEVED = "Users list retrieved successfully."
    USER_RETRIEVED = "User details retrieved successfully."
    APPROVALS_RETRIEVED = "Approval requests retrieved successfully."
    APPROVAL_CREATED = "Approval request created successfully."
    APPROVAL_UPDATED = "Approval request updated successfully."
    APPROVAL_DELETED = "Approval request deleted successfully."
    APPROVAL_APPROVED = "Approval request approved successfully."
    APPROVAL_REJECTED = "Approval request rejected successfully."
