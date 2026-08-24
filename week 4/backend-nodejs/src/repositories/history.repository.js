const { query } = require('../config/dbQuery');

const historyRepository = {
  async findByRequestId(requestId) {
    const sql = `
      SELECT h.*, u.firstName AS performerFirstName, u.lastName AS performerLastName,
             u.email AS performerEmail, r.name AS performerRole
      FROM ApprovalHistory h
      JOIN Users u ON h.performedBy = u.id
      JOIN Roles r ON u.roleId = r.id
      WHERE h.requestId = @requestId
      ORDER BY h.createdAt ASC
    `;
    return query(sql, { requestId });
  },

  async findAll({ page = 1, pageSize = 20, search = '', action = '' } = {}) {
    const pageNum = parseInt(page) || 1;
    const sizeNum = parseInt(pageSize) || 20;
    const offset = (pageNum - 1) * sizeNum;
    let where = 'WHERE 1=1';
    const params = {};

    if (search) {
      where += " AND (ar.requestNumber LIKE @search OR u.firstName LIKE @search OR u.lastName LIKE @search OR h.action LIKE @search)";
      params.search = `%${search}%`;
    }
    if (action) {
      where += " AND h.action = @action";
      params.action = action;
    }

    params.offset = offset;
    params.pageSize = sizeNum;

    const sql = `
      SELECT h.*, u.firstName AS performerFirstName, u.lastName AS performerLastName,
             u.email AS performerEmail, r.name AS performerRole,
             ar.requestNumber, ar.title AS requestTitle
      FROM ApprovalHistory h
      JOIN Users u ON h.performedBy = u.id
      JOIN Roles r ON u.roleId = r.id
      JOIN ApprovalRequests ar ON h.requestId = ar.id
      ${where}
      ORDER BY h.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM ApprovalHistory h
      JOIN Users u ON h.performedBy = u.id
      JOIN Roles r ON u.roleId = r.id
      JOIN ApprovalRequests ar ON h.requestId = ar.id
      ${where}
    `;

    const items = query(sql, params);
    const countRows = query(countSql, params);
    const total = countRows[0]?.total || 0;

    return { items, total };
  },

  async create({ requestId, action, fromStatus, toStatus, performedBy, comment }) {
    const sql = `
      INSERT INTO ApprovalHistory (requestId, action, fromStatus, toStatus, performedBy, comment)
      VALUES (@requestId, @action, @fromStatus, @toStatus, @performedBy, @comment);
      SELECT TOP 1 * FROM ApprovalHistory WHERE id = SCOPE_IDENTITY();
    `;
    const rows = query(sql, {
      requestId, action,
      fromStatus: fromStatus || null,
      toStatus: toStatus || null,
      performedBy,
      comment: comment || null,
    });
    return rows[0];
  },

  async createWithTransaction(tx, { requestId, action, fromStatus, toStatus, performedBy, comment }) {
    tx.add(`
      INSERT INTO ApprovalHistory (requestId, action, fromStatus, toStatus, performedBy, comment)
      VALUES (@requestId, @action, @fromStatus, @toStatus, @performedBy, @comment)
    `, {
      requestId, action,
      fromStatus: fromStatus || null,
      toStatus: toStatus || null,
      performedBy,
      comment: comment || null,
    });
  },
};

module.exports = historyRepository;
