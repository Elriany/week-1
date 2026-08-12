const { query } = require('../config/dbQuery');

const departmentRepository = {
  async findAll({ page = 1, pageSize = 10, search = '' } = {}) {
    const pageNum = parseInt(page) || 1;
    const sizeNum = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * sizeNum;
    let where = 'WHERE 1=1';
    if (search) where += " AND (d.name LIKE @search OR d.code LIKE @search)";

    const countRows = query(`SELECT COUNT(*) AS total FROM Departments d ${where}`, { search: `%${search}%` });
    const items = query(`
      SELECT d.*, 
             m.firstName AS managerFirstName, m.lastName AS managerLastName, m.email AS managerEmail,
             (SELECT COUNT(*) FROM Users u JOIN Roles r ON u.roleId = r.id WHERE u.departmentId = d.id AND r.name = 'EMPLOYEE') AS employeeCount
      FROM Departments d
      LEFT JOIN Users m ON d.managerId = m.id
      ${where}
      ORDER BY d.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `, { search: `%${search}%`, offset, pageSize });

    return { items, total: countRows[0]?.total || 0 };
  },

  async findById(id) {
    const rows = query(`
      SELECT d.*, 
             m.firstName AS managerFirstName, m.lastName AS managerLastName, m.email AS managerEmail, m.id AS currentManagerId,
             (SELECT COUNT(*) FROM Users u JOIN Roles r ON u.roleId = r.id WHERE u.departmentId = d.id AND r.name = 'EMPLOYEE') AS employeeCount
      FROM Departments d
      LEFT JOIN Users m ON d.managerId = m.id
      WHERE d.id = @id
    `, { id });
    return rows[0] || null;
  },

  async findByCode(code) {
    const rows = query('SELECT * FROM Departments WHERE code = @code', { code });
    return rows[0] || null;
  },

  async create({ code, name, description, isActive }) {
    const rows = query(`
      INSERT INTO Departments (code, name, description, isActive)
      OUTPUT INSERTED.*
      VALUES (@code, @name, @description, @isActive)
    `, { code, name, description: description || null, isActive: isActive !== undefined ? isActive : true });
    return rows[0];
  },

  async update(id, fields) {
    const sets = [];
    const params = { id };

    if (fields.name !== undefined) { sets.push('name = @name'); params.name = fields.name; }
    if (fields.code !== undefined) { sets.push('code = @code'); params.code = fields.code; }
    if (fields.description !== undefined) { sets.push('description = @desc'); params.desc = fields.description; }
    if (fields.isActive !== undefined) { sets.push('isActive = @isActive'); params.isActive = fields.isActive; }
    if (fields.managerId !== undefined) { sets.push('managerId = @managerId'); params.managerId = fields.managerId; }

    if (sets.length === 0) return null;
    sets.push('updatedAt = GETUTCDATE()');

    const rows = query(`UPDATE Departments SET ${sets.join(', ')} OUTPUT INSERTED.* WHERE id = @id`, params);
    return rows[0] || null;
  },

  async codeExists(code, excludeId = null) {
    let q = 'SELECT COUNT(*) AS cnt FROM Departments WHERE code = @code';
    const params = { code };
    if (excludeId) { q += ' AND id != @excludeId'; params.excludeId = excludeId; }
    const rows = query(q, params);
    return (rows[0]?.cnt || 0) > 0;
  },

  async isManagerAssigned(managerId, excludeDeptId = null) {
    let q = 'SELECT COUNT(*) AS cnt FROM Departments WHERE managerId = @managerId';
    const params = { managerId };
    if (excludeDeptId) { q += ' AND id != @excludeId'; params.excludeId = excludeDeptId; }
    const rows = query(q, params);
    return (rows[0]?.cnt || 0) > 0;
  },

  async getDepartmentByManagerId(managerId) {
    const rows = query('SELECT * FROM Departments WHERE managerId = @mId', { mId: managerId });
    return rows[0] || null;
  },
};

module.exports = departmentRepository;
