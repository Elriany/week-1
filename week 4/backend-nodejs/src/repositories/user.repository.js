const { query } = require('../config/dbQuery');

const userRepository = {
  async findById(id) {
    const sql = `
      SELECT u.id, u.employeeNumber, u.firstName, u.lastName, u.email, u.passwordHash,
             u.roleId, u.departmentId, u.status, u.createdAt, u.updatedAt,
             r.name AS role, d.name AS departmentName, d.code AS departmentCode
      FROM Users u
      JOIN Roles r ON u.roleId = r.id
      LEFT JOIN Departments d ON u.departmentId = d.id
      WHERE u.id = @id
    `;
    const rows = query(sql, { id });
    return rows[0] || null;
  },

  async findByEmail(email) {
    const sql = `
      SELECT u.id, u.employeeNumber, u.firstName, u.lastName, u.email, u.passwordHash,
             u.roleId, u.departmentId, u.status, u.createdAt, u.updatedAt,
             r.name AS role, d.name AS departmentName, d.code AS departmentCode
      FROM Users u
      JOIN Roles r ON u.roleId = r.id
      LEFT JOIN Departments d ON u.departmentId = d.id
      WHERE u.email = @email
    `;
    const rows = query(sql, { email });
    return rows[0] || null;
  },

  async emailExists(email) {
    const user = await this.findByEmail(email);
    return !!user;
  },

  async getRoleId(roleName) {
    const rows = query(`SELECT id FROM Roles WHERE name = @name`, { name: roleName });
    return rows[0]?.id || 3;
  },

  async findByDepartment(departmentId, { page = 1, pageSize = 10, search = '', status = '' } = {}) {
    const pageNum = parseInt(page) || 1;
    const sizeNum = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * sizeNum;
    let where = "WHERE u.departmentId = @deptId AND r.name = 'EMPLOYEE'";
    const params = { deptId: departmentId };

    if (search) {
      where += " AND (u.firstName LIKE @search OR u.lastName LIKE @search OR u.email LIKE @search OR u.employeeNumber LIKE @search)";
      params.search = `%${search}%`;
    }
    if (status) {
      where += " AND u.status = @status";
      params.status = status;
    }

    params.offset = offset;
    params.pageSize = sizeNum;

    const sql = `
      SELECT u.id, u.employeeNumber, u.firstName, u.lastName, u.email, u.status, u.createdAt,
             r.name AS role, d.name AS departmentName
      FROM Users u
      JOIN Roles r ON u.roleId = r.id
      LEFT JOIN Departments d ON u.departmentId = d.id
      ${where}
      ORDER BY u.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const countSql = `SELECT COUNT(*) AS total FROM Users u JOIN Roles r ON u.roleId = r.id ${where}`;

    const items = query(sql, params);
    const countRows = query(countSql, params);
    const total = countRows[0]?.total || 0;

    return { items, total };
  },

  async findAllEmployees({ page = 1, pageSize = 10, search = '', status = '', departmentId = null } = {}) {
    const pageNum = parseInt(page) || 1;
    const sizeNum = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * sizeNum;
    let where = "WHERE r.name = 'EMPLOYEE'";
    const params = {};

    if (departmentId) {
      where += " AND u.departmentId = @deptId";
      params.deptId = departmentId;
    }
    if (search) {
      where += " AND (u.firstName LIKE @search OR u.lastName LIKE @search OR u.email LIKE @search OR u.employeeNumber LIKE @search)";
      params.search = `%${search}%`;
    }
    if (status) {
      where += " AND u.status = @status";
      params.status = status;
    }

    params.offset = offset;
    params.pageSize = sizeNum;

    const sql = `
      SELECT u.id, u.employeeNumber, u.firstName, u.lastName, u.email, u.status, u.createdAt, u.departmentId,
             r.name AS role, d.name AS departmentName
      FROM Users u
      JOIN Roles r ON u.roleId = r.id
      LEFT JOIN Departments d ON u.departmentId = d.id
      ${where}
      ORDER BY u.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const countSql = `SELECT COUNT(*) AS total FROM Users u JOIN Roles r ON u.roleId = r.id ${where}`;

    const items = query(sql, params);
    const countRows = query(countSql, params);
    const total = countRows[0]?.total || 0;

    return { items, total };
  },

  async findAllManagers({ search = '' } = {}) {
    let where = "WHERE r.name = 'MANAGER'";
    const params = {};
    if (search) {
      where += " AND (u.firstName LIKE @search OR u.lastName LIKE @search OR u.email LIKE @search)";
      params.search = `%${search}%`;
    }
    const sql = `
      SELECT u.id, u.employeeNumber, u.firstName, u.lastName, u.email, u.status, u.departmentId, d.name AS departmentName
      FROM Users u
      JOIN Roles r ON u.roleId = r.id
      LEFT JOIN Departments d ON u.departmentId = d.id
      ${where}
      ORDER BY u.firstName ASC
    `;
    return query(sql, params);
  },

  async create({ employeeNumber, firstName, lastName, email, passwordHash, roleId, departmentId, status }) {
    const rows = query(`
      INSERT INTO Users (employeeNumber, firstName, lastName, email, passwordHash, roleId, departmentId, status)
      VALUES (@empNum, @fn, @ln, @email, @pass, @roleId, @deptId, @status);
      SELECT TOP 1 * FROM Users WHERE id = SCOPE_IDENTITY();
    `, {
      empNum: employeeNumber,
      fn: firstName,
      ln: lastName,
      email,
      pass: passwordHash,
      roleId,
      deptId: departmentId || null,
      status: status || 'INACTIVE',
    });
    return rows[0];
  },

  async update(id, data) {
    const sets = [];
    const params = { id };

    if (data.firstName !== undefined) { sets.push('firstName = @fn'); params.fn = data.firstName; }
    if (data.lastName !== undefined) { sets.push('lastName = @ln'); params.ln = data.lastName; }
    if (data.email !== undefined) { sets.push('email = @email'); params.email = data.email; }
    if (data.departmentId !== undefined) { sets.push('departmentId = @deptId'); params.deptId = data.departmentId || null; }
    if (data.status !== undefined) { sets.push('status = @status'); params.status = data.status; }

    if (sets.length === 0) return this.findById(id);

    sets.push('updatedAt = GETUTCDATE()');

    const rows = query(`
      UPDATE Users SET ${sets.join(', ')} WHERE id = @id;
      SELECT TOP 1 * FROM Users WHERE id = @id;
    `, params);
    return rows[0] || null;
  },

  async updateStatus(id, status) {
    const rows = query(`
      UPDATE Users SET status = @status, updatedAt = GETUTCDATE() WHERE id = @id;
      SELECT TOP 1 * FROM Users WHERE id = @id;
    `, { id, status });
    return rows[0] || null;
  },

  async updateStatusWithTransaction(tx, id, status) {
    tx.add(`UPDATE Users SET status = @status, updatedAt = GETUTCDATE() WHERE id = @id`, { id, status });
  },

  async getNextEmployeeNumber() {
    const rows = query(`SELECT MAX(id) AS maxId FROM Users`);
    const maxId = rows[0]?.maxId || 0;
    return `EMP-${String(maxId + 1).padStart(3, '0')}`;
  },
};

module.exports = userRepository;
