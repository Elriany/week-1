const { query } = require('../config/dbQuery');

const requestRepository = {
  async findAll({ page = 1, pageSize = 10, search = '', status = '', type = '', requesterId = null, departmentId = null, reviewable = false, reviewerId = null } = {}) {
    const pageNum = parseInt(page) || 1;
    const sizeNum = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * sizeNum;
    let where = 'WHERE 1=1';
    const params = {};

    if (search) { where += " AND (ar.title LIKE @search OR ar.requestNumber LIKE @search)"; params.search = `%${search}%`; }
    if (status) { where += ' AND ar.status = @status'; params.status = status; }
    if (type) { where += ' AND ar.type = @type'; params.type = type; }
    if (requesterId) { where += ' AND ar.requesterId = @requesterId'; params.requesterId = requesterId; }
    if (departmentId) {
      where += " AND (ar.requesterId = @mgrId OR (req.departmentId = @deptId AND reqRole.name = 'EMPLOYEE'))";
      params.deptId = departmentId;
      params.mgrId = reviewerId;
    }
    if (reviewable) {
      where += " AND ar.status IN ('PENDING_MANAGER', 'PENDING_ADMIN')";
    }

    const countRows = query(`
      SELECT COUNT(*) AS total 
      FROM ApprovalRequests ar
      JOIN Users req ON ar.requesterId = req.id
      JOIN Roles reqRole ON req.roleId = reqRole.id
      ${where}
    `, params);

    const items = query(`
      SELECT ar.*,
             req.firstName AS requesterFirstName, req.lastName AS requesterLastName, req.email AS requesterEmail,
             reqRole.name AS requesterRole,
             rev.firstName AS reviewerFirstName, rev.lastName AS reviewerLastName,
             tgt.firstName AS targetFirstName, tgt.lastName AS targetLastName, tgt.employeeNumber AS targetEmployeeNumber,
             reqDept.name AS requesterDepartmentName
      FROM ApprovalRequests ar
      JOIN Users req ON ar.requesterId = req.id
      JOIN Roles reqRole ON req.roleId = reqRole.id
      LEFT JOIN Departments reqDept ON req.departmentId = reqDept.id
      LEFT JOIN Users rev ON ar.reviewerId = rev.id
      LEFT JOIN Users tgt ON ar.targetEmployeeId = tgt.id
      ${where}
      ORDER BY ar.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `, { ...params, offset, pageSize });

    return { items, total: countRows[0]?.total || 0 };
  },

  async findById(id) {
    const rows = query(`
      SELECT ar.*,
             req.firstName AS requesterFirstName, req.lastName AS requesterLastName, req.email AS requesterEmail,
             req.departmentId AS requesterDepartmentId,
             reqRole.name AS requesterRole,
             rev.firstName AS reviewerFirstName, rev.lastName AS reviewerLastName,
             tgt.firstName AS targetFirstName, tgt.lastName AS targetLastName, tgt.employeeNumber AS targetEmployeeNumber,
             reqDept.name AS requesterDepartmentName
      FROM ApprovalRequests ar
      JOIN Users req ON ar.requesterId = req.id
      JOIN Roles reqRole ON req.roleId = reqRole.id
      LEFT JOIN Departments reqDept ON req.departmentId = reqDept.id
      LEFT JOIN Users rev ON ar.reviewerId = rev.id
      LEFT JOIN Users tgt ON ar.targetEmployeeId = tgt.id
      WHERE ar.id = @id
    `, { id });
    return rows[0] || null;
  },

  async create({ requestNumber, title, description, type, priority, status, requesterId, targetEmployeeId, dueDate }) {
    const rows = query(`
      INSERT INTO ApprovalRequests (requestNumber, title, description, type, priority, status, requesterId, targetEmployeeId, dueDate)
      OUTPUT INSERTED.*
      VALUES (@rn, @title, @desc, @type, @priority, @status, @requesterId, @targetEmpId, @dueDate)
    `, { rn: requestNumber, title, desc: description || null, type, priority: priority || 'MEDIUM', status: status || 'DRAFT', requesterId, targetEmpId: targetEmployeeId || null, dueDate: dueDate || null });
    return rows[0];
  },

  async updateStatus(id, status, reviewerId = null) {
    let q = 'UPDATE ApprovalRequests SET status = @status, updatedAt = GETUTCDATE()';
    const params = { id, status };
    if (reviewerId) { q += ', reviewerId = @reviewerId'; params.reviewerId = reviewerId; }
    q += ' OUTPUT INSERTED.* WHERE id = @id';
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
    `, { rn: data.requestNumber, title: data.title, desc: data.description || null, type: data.type, priority: data.priority || 'MEDIUM', status: data.status || 'DRAFT', requesterId: data.requesterId, targetEmpId: data.targetEmployeeId || null, dueDate: data.dueDate || null });
    
    // Fetch inserted record by requestNumber
    const rows = query(`SELECT * FROM ApprovalRequests WHERE requestNumber = @rn`, { rn: data.requestNumber });
    return rows[0] || { id: 999, ...data };
  },
};

module.exports = requestRepository;
