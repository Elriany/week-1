"""Test Authentication endpoint."""

def test_login_success(client):
    res = client.post("/api/v1/auth/login", json={"email": "employee@example.com", "password": "employee123"})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "token" in body["data"]
    assert body["data"]["user"]["role"] == "Employee"

def test_login_invalid_email(client):
    res = client.post("/api/v1/auth/login", json={"email": "nonexistent@example.com", "password": "any"})
    assert res.status_code == 401
    body = res.json()
    assert body["success"] is False
    assert "does not exist" in body["message"]

def test_login_invalid_password(client):
    res = client.post("/api/v1/auth/login", json={"email": "employee@example.com", "password": "wrongpassword"})
    assert res.status_code == 401
    body = res.json()
    assert body["success"] is False
    assert "Password is incorrect" in body["message"]

def test_login_validation_failure(client):
    res = client.post("/api/v1/auth/login", json={"email": "not-an-email", "password": "123"})
    assert res.status_code == 422
    body = res.json()
    assert body["success"] is False
    assert "Validation failed" in body["message"]
