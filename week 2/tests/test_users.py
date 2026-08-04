"""Test Users endpoints and RBAC."""

def test_get_all_users_admin(client, admin_token):
    res = client.get("/api/v1/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert len(body["data"]) >= 4

def test_get_all_users_forbidden_for_employee(client, employee_token):
    res = client.get("/api/v1/users", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 403
    body = res.json()
    assert body["success"] is False

def test_get_user_self_profile_employee(client, employee_token):
    res = client.get("/api/v1/users/usr-3", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 200
    body = res.json()
    assert body["data"]["id"] == "usr-3"

def test_get_other_user_profile_forbidden_for_employee(client, employee_token):
    res = client.get("/api/v1/users/usr-1", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 403

def test_get_user_by_id_not_found(client, admin_token):
    res = client.get("/api/v1/users/usr-999", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 404
