const { query } = require('../config/dbQuery');

const statusRequestRepository = {
  async findAll({ status = '', requestType = '', managerId = null, departmentId = null } = {}) {
    let where = 'WHERE 1=1';
    const params = {};

    if (status) {
      where += " AND esr.status = @status";
      params.status = status;
    }
    if (requestType) {
      where += " AND esr.requestType = @requestType";
      params.requestType = requestType;
    }
    if (managerId) {
      where += " AND esr.managerId = @managerId";
      params.managerId = managerId;
    }
    if (departmentId) {
      where += " AND emp.departmentId = @departmentId";
      params.departmentId = departmentId;
    }

    const sql = `
      SELECT esr.*,
             emp.firstName AS employeeFirstName, emp.lastName AS employeeLastName, emp.employeeNumber, emp.email AS employeeEmail,
             m.firstName AS managerFirstName, m.lastName AS managerLastName, m.email AS managerEmail,
             adm.firstName AS adminFirstName, adm.lastName AS adminLastName,
             dept.name AS departmentName
      FROM EmployeeStatusRequests esr
      JOIN Users emp ON esr.employeeId = emp.id
      JOIN Users m ON esr.managerId = m.id
      LEFT JOIN Users adm ON esr.adminId = adm.id
      LEFT JOIN Departments dept ON emp.departmentId = dept.id
      ${where}
      ORDER BY esr.createdAt DESC
    `;
    return query(sql, params);
  },

  async findById(id) {
    const sql = `
      SELECT esr.*,
             emp.firstName AS employeeFirstName, emp.lastName AS employeeLastName, emp.employeeNumber, emp.email AS employeeEmail, emp.status AS currentEmployeeStatus,
             m.firstName AS managerFirstName, m.lastName AS managerLastName,
             adm.firstName AS adminFirstName, adm.lastName AS adminLastName
      FROM EmployeeStatusRequests esr
      JOIN Users emp ON esr.employeeId = emp.id
      JOIN Users m ON esr.managerId = m.id
      LEFT JOIN Users adm ON esr.adminId = adm.id
      WHERE esr.id = @id
    `;
    const rows = query(sql, { id });
    return rows[0] || null;
  },

  async hasPendingRequest(employeeId) {
    const sql = `SELECT TOP 1 1 AS ex FROM EmployeeStatusRequests WHERE employeeId = @employeeId AND status = 'PENDING'`;
    const rows = query(sql, { employeeId });
    return rows.length > 0;
  },

  async create({ employeeId, managerId, requestType, reason }) {
    const sql = `
      INSERT INTO EmployeeStatusRequests (employeeId, managerId, requestType, reason, status)
      VALUES (@employeeId, @managerId, @requestType, @reason, 'PENDING');
      SELECT TOP 1 * FROM EmployeeStatusRequests WHERE id = SCOPE_IDENTITY();
    `;
    const rows = query(sql, { employeeId, managerId, requestType, reason });
    return rows[0];
  },

  async updateStatus(id, status, adminId = null, adminNotes = null) {
    let q = 'UPDATE EmployeeStatusRequests SET status = @status, updatedAt = GETUTCDATE()';
    const params = { id, status };
    if (adminId) { q += ', adminId = @adminId'; params.adminId = adminId; }
    if (adminNotes) { q += ', adminNotes = @adminNotes'; params.adminNotes = adminNotes; }
    q += ' WHERE id = @id; SELECT TOP 1 * FROM EmployeeStatusRequests WHERE id = @id;';
    const rows = query(q, params);
    return rows[0] || null;
  },

  async linkApprovalRequestId(id, approvalRequestId) {
    query(`UPDATE EmployeeStatusRequests SET approvalRequestId = @approvalRequestId WHERE id = @id`, { id, approvalRequestId });
  },

  async linkApprovalRequestIdWithTransaction(tx, id, approvalRequestId) {
    tx.add(`UPDATE EmployeeStatusRequests SET approvalRequestId = @approvalRequestId WHERE id = @id`, { id, approvalRequestId });
  },

  async updateStatusWithTransaction(tx, id, status, adminId = null, adminNotes = null) {
    let q = 'UPDATE EmployeeStatusRequests SET status = @status, updatedAt = GETUTCDATE()';
    const params = { id, status };
    if (adminId) { q += ', adminId = @adminId'; params.adminId = adminId; }
    if (adminNotes) { q += ', adminNotes = @adminNotes'; params.adminNotes = adminNotes; }
    q += ' WHERE id = @id';
    tx.add(q, params);
  },
};

module.exports = statusRequestRepository;
