const { query, TransactionHelper } = require('../config/dbQuery');

const userRepository = {
  async findByEmail(email) {
    const rows = query(`
      SELECT u.*, r.name AS roleName, d.name AS departmentName, d.code AS departmentCode
      FROM Users u
      JOIN Roles r ON u.roleId = r.id
      LEFT JOIN Departments d ON u.departmentId = d.id
      WHERE u.email = @email
    `, { email });
    return rows[0] || null;
  },

  async findById(id) {
    const rows = query(`
      SELECT u.id, u.employeeNumber, u.firstName, u.lastName, u.email, u.phone,
             u.roleId, u.departmentId, u.status, u.createdAt, u.updatedAt,
             r.name AS roleName, d.name AS departmentName, d.code AS departmentCode
      FROM Users u
      JOIN Roles r ON u.roleId = r.id
      LEFT JOIN Departments d ON u.departmentId = d.id
      WHERE u.id = @id
    `, { id });
    return rows[0] || null;
  },

  async findByDepartment(departmentId, { page = 1, pageSize = 10, search = '', status = '' } = {}) {
    const pageNum = parseInt(page) || 1;
    const sizeNum = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * sizeNum;
    let where = "WHERE u.departmentId = @deptId AND r.name = 'EMPLOYEE'";
    if (search) where += " AND (u.firstName LIKE @search OR u.lastName LIKE @search OR u.email LIKE @search OR u.employeeNumber LIKE @search)";
    if (status) where += " AND u.status = @status";

    const countRows = query(`SELECT COUNT(*) AS total FROM Users u JOIN Roles r ON u.roleId = r.id ${where}`, {
      deptId: departmentId, search: `%${search}%`, status,
    });

    const items = query(`
      SELECT u.id, u.employeeNumber, u.firstName, u.lastName, u.email, u.phone,
             u.status, u.createdAt, u.updatedAt,
             r.name AS roleName, d.name AS departmentName
      FROM Users u
      JOIN Roles r ON u.roleId = r.id
      LEFT JOIN Departments d ON u.departmentId = d.id
      ${where}
      ORDER BY u.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `, { deptId: departmentId, search: `%${search}%`, status, offset, pageSize });

    return { items, total: countRows[0]?.total || 0 };
  },

  async findAllEmployees({ page = 1, pageSize = 10, search = '', status = '', departmentId = '' } = {}) {
    const offset = (page - 1) * pageSize;
    let where = "WHERE r.name = 'EMPLOYEE'";
    if (search) where += " AND (u.firstName LIKE @search OR u.lastName LIKE @search OR u.email LIKE @search OR u.employeeNumber LIKE @search)";
    if (status) where += " AND u.status = @status";
    if (departmentId) where += " AND u.departmentId = @departmentId";

    const countRows = query(`SELECT COUNT(*) AS total FROM Users u JOIN Roles r ON u.roleId = r.id ${where}`, {
      search: `%${search}%`, status, departmentId: departmentId ? parseInt(departmentId) : 0,
    });

    const items = query(`
      SELECT u.id, u.employeeNumber, u.firstName, u.lastName, u.email, u.phone,
             u.status, u.departmentId, u.createdAt, u.updatedAt,
             r.name AS roleName, d.name AS departmentName, d.code AS departmentCode
      FROM Users u
      JOIN Roles r ON u.roleId = r.id
      LEFT JOIN Departments d ON u.departmentId = d.id
      ${where}
      ORDER BY u.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `, { search: `%${search}%`, status, departmentId: departmentId ? parseInt(departmentId) : 0, offset, pageSize });

    return { items, total: countRows[0]?.total || 0 };
  },

  async findAllManagers({ page = 1, pageSize = 10, search = '' } = {}) {
    const offset = (page - 1) * pageSize;
    let where = "WHERE r.name = 'MANAGER'";
    if (search) where += " AND (u.firstName LIKE @search OR u.lastName LIKE @search OR u.email LIKE @search)";

    const countRows = query(`SELECT COUNT(*) AS total FROM Users u JOIN Roles r ON u.roleId = r.id ${where}`, {
      search: `%${search}%`,
    });

    const items = query(`
      SELECT u.id, u.employeeNumber, u.firstName, u.lastName, u.email, u.phone,
             u.status, u.departmentId, u.createdAt, u.updatedAt,
             r.name AS roleName, d.name AS departmentName, d.code AS departmentCode
      FROM Users u
      JOIN Roles r ON u.roleId = r.id
      LEFT JOIN Departments d ON u.departmentId = d.id
      ${where}
      ORDER BY u.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `, { search: `%${search}%`, offset, pageSize });

    return { items, total: countRows[0]?.total || 0 };
  },

  async create({ employeeNumber, firstName, lastName, email, phone, passwordHash, roleId, departmentId, status }) {
    const rows = query(`
      INSERT INTO Users (employeeNumber, firstName, lastName, email, phone, passwordHash, roleId, departmentId, status)
      OUTPUT INSERTED.*
      VALUES (@empNum, @firstName, @lastName, @email, @phone, @pwdHash, @roleId, @deptId, @status)
    `, { empNum: employeeNumber, firstName, lastName, email, phone: phone || null, pwdHash: passwordHash, roleId, deptId: departmentId || null, status: status || 'ACTIVE' });
    return rows[0];
  },

  async update(id, fields) {
    const sets = [];
    const params = { id };

    if (fields.firstName !== undefined) { sets.push('firstName = @firstName'); params.firstName = fields.firstName; }
    if (fields.lastName !== undefined) { sets.push('lastName = @lastName'); params.lastName = fields.lastName; }
    if (fields.email !== undefined) { sets.push('email = @email'); params.email = fields.email; }
    if (fields.phone !== undefined) { sets.push('phone = @phone'); params.phone = fields.phone; }
    if (fields.departmentId !== undefined) { sets.push('departmentId = @deptId'); params.deptId = fields.departmentId; }
    if (fields.status !== undefined) { sets.push('status = @status'); params.status = fields.status; }
    if (fields.passwordHash !== undefined) { sets.push('passwordHash = @pwdHash'); params.pwdHash = fields.passwordHash; }

    if (sets.length === 0) return null;
    sets.push('updatedAt = GETUTCDATE()');

    const rows = query(`UPDATE Users SET ${sets.join(', ')} OUTPUT INSERTED.* WHERE id = @id`, params);
    return rows[0] || null;
  },

  async emailExists(email, excludeId = null) {
    let q = 'SELECT COUNT(*) AS cnt FROM Users WHERE email = @email';
    const params = { email };
    if (excludeId) { q += ' AND id != @excludeId'; params.excludeId = excludeId; }
    const rows = query(q, params);
    return (rows[0]?.cnt || 0) > 0;
  },

  async employeeNumberExists(empNum) {
    const rows = query('SELECT COUNT(*) AS cnt FROM Users WHERE employeeNumber = @empNum', { empNum });
    return (rows[0]?.cnt || 0) > 0;
  },

  async getRoleId(roleName) {
    const rows = query('SELECT id FROM Roles WHERE name = @name', { name: roleName });
    return rows[0]?.id || null;
  },

  async getNextEmployeeNumber() {
    const rows = query(`SELECT MAX(CAST(REPLACE(employeeNumber, 'EMP-', '') AS INT)) AS maxNum FROM Users`);
    const maxNum = rows[0]?.maxNum || 0;
    return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
  },

  async updateStatusWithTransaction(tx, userId, newStatus) {
    tx.add('UPDATE Users SET status = @status, updatedAt = GETUTCDATE() WHERE id = @id', { id: userId, status: newStatus });
  },
};

module.exports = userRepository;
