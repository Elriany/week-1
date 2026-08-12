const { query } = require('../config/dbQuery');

const statusRequestRepository = {
  async findAll({ page = 1, pageSize = 10, status = '', requestType = '' } = {}) {
    const pageNum = parseInt(page) || 1;
    const sizeNum = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * sizeNum;
    let where = 'WHERE 1=1';
    const params = {};

    if (status) { where += ' AND sr.status = @status'; params.status = status; }
    if (requestType) { where += ' AND sr.requestType = @reqType'; params.reqType = requestType; }

    const countRows = query(`SELECT COUNT(*) AS total FROM EmployeeStatusRequests sr ${where}`, params);

    const items = query(`
      SELECT sr.*,
             emp.firstName AS employeeFirstName, emp.lastName AS employeeLastName,
             emp.email AS employeeEmail, emp.employeeNumber,
             emp.status AS employeeCurrentStatus,
             mgr.firstName AS requestedByFirstName, mgr.lastName AS requestedByLastName,
             d.name AS departmentName, d.code AS departmentCode,
             ar.requestNumber, ar.status AS approvalStatus
      FROM EmployeeStatusRequests sr
      JOIN Users emp ON sr.employeeId = emp.id
      JOIN Users mgr ON sr.requestedBy = mgr.id
      JOIN Departments d ON sr.departmentId = d.id
      LEFT JOIN ApprovalRequests ar ON sr.approvalRequestId = ar.id
      ${where}
      ORDER BY sr.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `, { ...params, offset, pageSize });

    return { items, total: countRows[0]?.total || 0 };
  },

  async findById(id) {
    const rows = query(`
      SELECT sr.*,
             emp.firstName AS employeeFirstName, emp.lastName AS employeeLastName,
             emp.email AS employeeEmail, emp.employeeNumber,
             emp.status AS employeeCurrentStatus,
             mgr.firstName AS requestedByFirstName, mgr.lastName AS requestedByLastName,
             d.name AS departmentName, d.code AS departmentCode,
             ar.requestNumber, ar.status AS approvalStatus
      FROM EmployeeStatusRequests sr
      JOIN Users emp ON sr.employeeId = emp.id
      JOIN Users mgr ON sr.requestedBy = mgr.id
      JOIN Departments d ON sr.departmentId = d.id
      LEFT JOIN ApprovalRequests ar ON sr.approvalRequestId = ar.id
      WHERE sr.id = @id
    `, { id });
    return rows[0] || null;
  },

  async create({ employeeId, requestedBy, departmentId, requestType, reason, approvalRequestId }) {
    const rows = query(`
      INSERT INTO EmployeeStatusRequests (employeeId, requestedBy, departmentId, requestType, reason, approvalRequestId)
      OUTPUT INSERTED.*
      VALUES (@empId, @reqBy, @deptId, @reqType, @reason, @aprId)
    `, { empId: employeeId, reqBy: requestedBy, deptId: departmentId, reqType: requestType, reason: reason || null, aprId: approvalRequestId || null });
    return rows[0];
  },

  async createWithTransaction(tx, data) {
    tx.add(`
      INSERT INTO EmployeeStatusRequests (employeeId, requestedBy, departmentId, requestType, reason, approvalRequestId)
      VALUES (@empId, @reqBy, @deptId, @reqType, @reason, @aprId)
    `, { empId: data.employeeId, reqBy: data.requestedBy, deptId: data.departmentId, reqType: data.requestType, reason: data.reason || null, aprId: data.approvalRequestId || null });
  },

  async updateStatusWithTransaction(tx, id, newStatus) {
    tx.add(`UPDATE EmployeeStatusRequests SET status = @status, updatedAt = GETUTCDATE() WHERE id = @id`, { id, status: newStatus });
  },

  async hasPendingRequest(employeeId, requestType) {
    const rows = query(`SELECT COUNT(*) AS cnt FROM EmployeeStatusRequests WHERE employeeId = @empId AND requestType = @reqType AND status = 'PENDING'`, { empId: employeeId, reqType: requestType });
    return (rows[0]?.cnt || 0) > 0;
  },
};

module.exports = statusRequestRepository;
