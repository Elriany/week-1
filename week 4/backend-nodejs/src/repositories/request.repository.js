const { query } = require('../config/dbQuery');

const requestRepository = {
  async findAll({ page = 1, pageSize = 10, search = '', status = '', type = '', requesterId = null, departmentId = null, reviewable = false, reviewerId = null } = {}) {
    const pageNum = parseInt(page) || 1;
    const sizeNum = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * sizeNum;
    let where = 'WHERE 1=1';
    const params = {};

    if (search) {
      where += " AND (ar.requestNumber LIKE @search OR ar.title LIKE @search OR ar.description LIKE @search)";
      params.search = `%${search}%`;
    }
    if (status) {
      where += " AND ar.status = @status";
      params.status = status;
    }
    if (type) {
      where += " AND ar.type = @type";
      params.type = type;
    }
    if (requesterId) {
      where += " AND ar.requesterId = @requesterId";
      params.requesterId = requesterId;
    }

    if (reviewable && departmentId) {
      where += " AND ((ar.status = 'PENDING_MANAGER' AND req.departmentId = @departmentId AND req.roleId = 3) OR (ar.status = 'PENDING_ADMIN' AND req.roleId = 2))";
      params.departmentId = departmentId;
    }

    params.offset = offset;
    params.pageSize = sizeNum;

    const sql = `
      SELECT ar.*,
             req.firstName AS requesterFirstName, req.lastName AS requesterLastName,
             req.email AS requesterEmail, reqR.name AS requesterRole,
             rev.firstName AS reviewerFirstName, rev.lastName AS reviewerLastName,
             tgt.firstName AS targetFirstName, tgt.lastName AS targetLastName, tgt.employeeNumber AS targetEmployeeNumber,
             dept.name AS requesterDepartmentName
      FROM ApprovalRequests ar
      JOIN Users req ON ar.requesterId = req.id
      JOIN Roles reqR ON req.roleId = reqR.id
      LEFT JOIN Users rev ON ar.reviewerId = rev.id
      LEFT JOIN Users tgt ON ar.targetEmployeeId = tgt.id
      LEFT JOIN Departments dept ON req.departmentId = dept.id
      ${where}
      ORDER BY ar.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM ApprovalRequests ar
      JOIN Users req ON ar.requesterId = req.id
      JOIN Roles reqR ON req.roleId = reqR.id
      ${where}
    `;

    const items = query(sql, params);
    const countRows = query(countSql, params);
    const total = countRows[0]?.total || 0;

    return { items, total };
  },

  async findById(id) {
    const sql = `
      SELECT ar.*,
             req.firstName AS requesterFirstName, req.lastName AS requesterLastName,
             req.email AS requesterEmail, reqR.name AS requesterRole, req.departmentId AS requesterDepartmentId,
             rev.firstName AS reviewerFirstName, rev.lastName AS reviewerLastName,
             tgt.firstName AS targetFirstName, tgt.lastName AS targetLastName, tgt.employeeNumber AS targetEmployeeNumber,
             dept.name AS requesterDepartmentName
      FROM ApprovalRequests ar
      JOIN Users req ON ar.requesterId = req.id
      JOIN Roles reqR ON req.roleId = reqR.id
      LEFT JOIN Users rev ON ar.reviewerId = rev.id
      LEFT JOIN Users tgt ON ar.targetEmployeeId = tgt.id
      LEFT JOIN Departments dept ON req.departmentId = dept.id
      WHERE ar.id = @id
    `;
    const rows = query(sql, { id });
    return rows[0] || null;
  },

  async create({ requestNumber, title, description, type, priority, status, requesterId, targetEmployeeId, dueDate }) {
    const rows = query(`
      INSERT INTO ApprovalRequests (requestNumber, title, description, type, priority, status, requesterId, targetEmployeeId, dueDate)
      VALUES (@rn, @title, @desc, @type, @priority, @status, @requesterId, @targetEmpId, @dueDate);
      SELECT TOP 1 * FROM ApprovalRequests WHERE id = SCOPE_IDENTITY();
    `, { rn: requestNumber, title, desc: description || null, type, priority: priority || 'MEDIUM', status: status || 'DRAFT', requesterId, targetEmpId: targetEmployeeId || null, dueDate: dueDate || null });
    return rows[0];
  },

  async updateStatus(id, status, reviewerId = null) {
    let q = 'UPDATE ApprovalRequests SET status = @status, updatedAt = GETUTCDATE()';
    const params = { id, status };
    if (reviewerId) { q += ', reviewerId = @reviewerId'; params.reviewerId = reviewerId; }
    q += ' WHERE id = @id; SELECT TOP 1 * FROM ApprovalRequests WHERE id = @id;';
    const rows = query(q, params);
    return rows[0] || null;
  },

  async updateStatusWithTransaction(tx, id, status, reviewerId = null, attempt = null) {
    let q = 'UPDATE ApprovalRequests SET status = @status, updatedAt = GETUTCDATE()';
    const params = { id, status };
    if (reviewerId) { q += ', reviewerId = @reviewerId'; params.reviewerId = reviewerId; }
    if (attempt) { q += ', attempt = @attempt'; params.attempt = attempt; }
    q += ' WHERE id = @id';
    tx.add(q, params);
  },

  async getNextRequestNumber() {
    const year = new Date().getFullYear();
    const rows = query(`SELECT MAX(id) AS maxId FROM ApprovalRequests`);
    const maxId = rows[0]?.maxId || 0;
    return `APR-${year}-${String(maxId + 1).padStart(6, '0')}`;
  },

  async createWithTransaction(tx, data) {
    tx.add(`
      INSERT INTO ApprovalRequests (requestNumber, title, description, type, priority, status, requesterId, targetEmployeeId, dueDate)
      VALUES (@rn, @title, @desc, @type, @priority, @status, @requesterId, @targetEmpId, @dueDate)
    `, {
      rn: data.requestNumber,
      title: data.title,
      desc: data.description || null,
      type: data.type,
      priority: data.priority || 'MEDIUM',
      status: data.status || 'DRAFT',
      requesterId: data.requesterId,
      targetEmpId: data.targetEmployeeId || null,
      dueDate: data.dueDate || null,
    });
    // For transaction helper, get max ID estimation
    const rows = query(`SELECT ISNULL(MAX(id), 0) + 1 AS nextId FROM ApprovalRequests`);
    const nextId = rows[0]?.nextId || 1;
    return { id: nextId, ...data };
  },
};

module.exports = requestRepository;
