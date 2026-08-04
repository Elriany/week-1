"""In-Memory Mock Users Database (Python List of Dicts) matching Week 1 initial state."""

from app.core.security import hash_password
from app.config.constants import Roles

users = [
    {
        "id": "usr-1",
        "name": "System Admin",
        "email": "admin@example.com",
        "password": hash_password("admin123"),
        "role": Roles.ADMIN,
        "createdAt": "2026-01-01T08:00:00.000Z",
    },
    {
        "id": "usr-2",
        "name": "Sarah Jenkins",
        "email": "manager@example.com",
        "password": hash_password("manager123"),
        "role": Roles.MANAGER,
        "createdAt": "2026-01-02T09:00:00.000Z",
    },
    {
        "id": "usr-3",
        "name": "John Doe",
        "email": "employee@example.com",
        "password": hash_password("employee123"),
        "role": Roles.EMPLOYEE,
        "createdAt": "2026-01-03T10:00:00.000Z",
    },
    {
        "id": "usr-4",
        "name": "Alice Smith",
        "email": "alice@example.com",
        "password": hash_password("employee123"),
        "role": Roles.EMPLOYEE,
        "createdAt": "2026-01-04T11:00:00.000Z",
    },
]
