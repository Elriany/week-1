"""Test Approvals CRUD, RBAC, Filtering, Search, Sorting, Pagination & Validation."""

def test_unauthenticated_request(client):
    res = client.get("/api/v1/approvals")
    assert res.status_code == 401

def test_employee_sees_own_approvals_only(client, employee_token):
    res = client.get("/api/v1/approvals", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 200
    items = res.json()["data"]["approvals"]
    for item in items:
        assert item["requesterId"] == "usr-3"

def test_manager_sees_all_approvals(client, manager_token):
    res = client.get("/api/v1/approvals", headers={"Authorization": f"Bearer {manager_token}"})
    assert res.status_code == 200
    items = res.json()["data"]["approvals"]
    assert len(items) >= 4

def test_create_approval_validation_failure(client, employee_token):
    res = client.post(
        "/api/v1/approvals",
        json={"title": "ab", "description": "short"},
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    assert res.status_code == 422
    body = res.json()
    assert body["success"] is False

def test_create_approval_success(client, employee_token):
    res = client.post(
        "/api/v1/approvals",
        json={"title": "New Monitor Request", "description": "4K UltraWide Monitor for design work."},
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["title"] == "New Monitor Request"
    assert data["status"] == "PENDING"
    assert data["requesterId"] == "usr-3"

def test_update_pending_approval_owner_success(client, employee_token):
    # req-101 is pending owned by usr-3
    res = client.put(
        "/api/v1/approvals/req-101",
        json={"title": "Updated MacBook Request Title"},
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    assert res.status_code == 200
    assert res.json()["data"]["title"] == "Updated MacBook Request Title"

def test_update_approval_forbidden_for_other_employee(client, employee2_token):
    # req-101 is owned by usr-3, tried by usr-4
    res = client.put(
        "/api/v1/approvals/req-101",
        json={"title": "Unauthorized Edit Attempt"},
        headers={"Authorization": f"Bearer {employee2_token}"}
    )
    assert res.status_code == 403

def test_update_approved_approval_forbidden_for_employee(client, employee_token):
    # req-102 is APPROVED owned by usr-3
    res = client.put(
        "/api/v1/approvals/req-102",
        json={"title": "Trying to edit approved request"},
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    assert res.status_code == 403

def test_approve_request_manager_success(client, manager_token):
    res = client.post(
        "/api/v1/approvals/req-104/approve",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "APPROVED"

def test_approve_request_employee_forbidden(client, employee_token):
    res = client.post(
        "/api/v1/approvals/req-101/approve",
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    assert res.status_code == 403

def test_reject_request_admin_success(client, admin_token):
    res = client.post(
        "/api/v1/approvals/req-101/reject",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "REJECTED"

def test_filtering_and_search(client, manager_token):
    res = client.get(
        "/api/v1/approvals?status=REJECTED&search=Office",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert res.status_code == 200
    items = res.json()["data"]["approvals"]
    assert len(items) >= 1
    assert items[0]["status"] == "REJECTED"

def test_pagination_and_sorting(client, manager_token):
    res = client.get(
        "/api/v1/approvals?sort=createdAt&sortDirection=asc&page=1&pageSize=2",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert res.status_code == 200
    pagination = res.json()["data"]["pagination"]
    assert pagination["pageSize"] == 2
    assert pagination["page"] == 1

def test_get_approval_by_id_not_found(client, manager_token):
    res = client.get("/api/v1/approvals/req-999", headers={"Authorization": f"Bearer {manager_token}"})
    assert res.status_code == 404
