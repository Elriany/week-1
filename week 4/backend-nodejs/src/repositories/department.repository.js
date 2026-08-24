const { query } = require('../config/dbQuery');

const departmentRepository = {
  async findAll({ page = 1, pageSize = 10, search = '' } = {}) {
    const pageNum = parseInt(page) || 1;
    const sizeNum = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * sizeNum;
    let where = 'WHERE 1=1';
    const params = {};

    if (search) {
      where += " AND (d.name LIKE @search OR d.code LIKE @search)";
      params.search = `%${search}%`;
    }

    params.offset = offset;
    params.pageSize = sizeNum;

    const sql = `
      SELECT d.*, 
             m.firstName AS managerFirstName, m.lastName AS managerLastName, m.email AS managerEmail,
             (SELECT COUNT(*) FROM Users u JOIN Roles r ON u.roleId = r.id WHERE u.departmentId = d.id AND r.name = 'EMPLOYEE') AS employeeCount
      FROM Departments d
      LEFT JOIN Users m ON d.managerId = m.id
      ${where}
      ORDER BY d.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const countSql = `SELECT COUNT(*) AS total FROM Departments d ${where}`;

    const items = query(sql, params);
    const countRows = query(countSql, params);
    const total = countRows[0]?.total || 0;

    return { items, total };
  },

  async findById(id) {
    const sql = `
      SELECT d.*, m.firstName AS managerFirstName, m.lastName AS managerLastName, m.email AS managerEmail
      FROM Departments d
      LEFT JOIN Users m ON d.managerId = m.id
      WHERE d.id = @id
    `;
    const rows = query(sql, { id });
    return rows[0] || null;
  },

  async findByCode(code) {
    const rows = query(`SELECT * FROM Departments WHERE code = @code`, { code });
    return rows[0] || null;
  },

  async codeExists(code) {
    const dept = await this.findByCode(code);
    return !!dept;
  },

  async create({ name, code, managerId }) {
    const rows = query(`
      INSERT INTO Departments (name, code, managerId)
      VALUES (@name, @code, @managerId);
      SELECT TOP 1 * FROM Departments WHERE id = SCOPE_IDENTITY();
    `, { name, code, managerId: managerId || null });
    return rows[0];
  },

  async update(id, data) {
    const sets = [];
    const params = { id };

    if (data.name !== undefined) { sets.push('name = @name'); params.name = data.name; }
    if (data.code !== undefined) { sets.push('code = @code'); params.code = data.code; }
    if (data.managerId !== undefined) { sets.push('managerId = @managerId'); params.managerId = data.managerId || null; }

    if (sets.length === 0) return this.findById(id);

    sets.push('updatedAt = GETUTCDATE()');

    const rows = query(`
      UPDATE Departments SET ${sets.join(', ')} WHERE id = @id;
      SELECT TOP 1 * FROM Departments WHERE id = @id;
    `, params);
    return rows[0] || null;
  },

  async delete(id) {
    query(`DELETE FROM Departments WHERE id = @id`, { id });
    return true;
  },
};

module.exports = departmentRepository;
