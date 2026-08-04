"""Pytest Fixtures for FastAPI Approval API."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    """Provides a synchronous HTTP test client for FastAPI."""
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture(scope="module")
def admin_token(client):
    """Obtains valid Bearer token for System Admin."""
    res = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "admin123"})
    return res.json()["data"]["token"]

@pytest.fixture(scope="module")
def manager_token(client):
    """Obtains valid Bearer token for Manager."""
    res = client.post("/api/v1/auth/login", json={"email": "manager@example.com", "password": "manager123"})
    return res.json()["data"]["token"]

@pytest.fixture(scope="module")
def employee_token(client):
    """Obtains valid Bearer token for Employee (John Doe - usr-3)."""
    res = client.post("/api/v1/auth/login", json={"email": "employee@example.com", "password": "employee123"})
    return res.json()["data"]["token"]

@pytest.fixture(scope="module")
def employee2_token(client):
    """Obtains valid Bearer token for Alice Smith (usr-4)."""
    res = client.post("/api/v1/auth/login", json={"email": "alice@example.com", "password": "employee123"})
    return res.json()["data"]["token"]
