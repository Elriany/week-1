"""In-Memory Mock Approvals Database (Python List of Dicts) matching Week 1 initial state."""

from app.config.constants import ApprovalStatus

approvals = [
    {
        "id": "req-101",
        "title": "MacBook Pro Purchase Request",
        "description": "Hardware upgrade for senior developer setup and performance testing.",
        "requesterId": "usr-3",
        "status": ApprovalStatus.PENDING,
        "createdAt": "2026-02-01T10:30:00.000Z",
        "updatedAt": "2026-02-01T10:30:00.000Z",
    },
    {
        "id": "req-102",
        "title": "AWS Cloud Conference Ticket",
        "description": "Registration fee for annual cloud computing and devops workshop.",
        "requesterId": "usr-3",
        "status": ApprovalStatus.APPROVED,
        "createdAt": "2026-02-02T14:15:00.000Z",
        "updatedAt": "2026-02-03T09:00:00.000Z",
    },
    {
        "id": "req-103",
        "title": "Ergonomic Office Chair",
        "description": "Request for ergonomic office chair replacement.",
        "requesterId": "usr-4",
        "status": ApprovalStatus.REJECTED,
        "createdAt": "2026-02-03T11:00:00.000Z",
        "updatedAt": "2026-02-04T16:20:00.000Z",
    },
    {
        "id": "req-104",
        "title": "Software Development Course Subscription",
        "description": "Annual subscription to online technical course library.",
        "requesterId": "usr-4",
        "status": ApprovalStatus.PENDING,
        "createdAt": "2026-02-04T08:45:00.000Z",
        "updatedAt": "2026-02-04T08:45:00.000Z",
    },
]
