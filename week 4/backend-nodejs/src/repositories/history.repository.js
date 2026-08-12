const { query } = require('../config/dbQuery');

const historyRepository = {
  async findByRequestId(requestId) {
    const rows = query(`
      SELECT h.*, u.firstName AS performerFirstName, u.lastName AS performerLastName,
             u.email AS performerEmail, r.name AS performerRole
      FROM ApprovalHistory h
      JOIN Users u ON h.performedBy = u.id
      JOIN Roles r ON u.roleId = r.id
      WHERE h.requestId = @reqId
      ORDER BY h.createdAt ASC
    `, { reqId: requestId });
    return rows;
  },

  async findAll({ page = 1, pageSize = 20, search = '', action = '' } = {}) {
    const offset = (page - 1) * pageSize;
    let where = 'WHERE 1=1';
    const params = {};

    if (search) { where += " AND (ar.requestNumber LIKE @search OR ar.title LIKE @search)"; params.search = `%${search}%`; }
    if (action) { where += ' AND h.action = @action'; params.action = action; }

    const countRows = query(`
      SELECT COUNT(*) AS total FROM ApprovalHistory h
      JOIN ApprovalRequests ar ON h.requestId = ar.id
      ${where}
    `, params);

    const items = query(`
      SELECT h.*, u.firstName AS performerFirstName, u.lastName AS performerLastName,
             r.name AS performerRole,
             ar.requestNumber, ar.title AS requestTitle
      FROM ApprovalHistory h
      JOIN Users u ON h.performedBy = u.id
      JOIN Roles r ON u.roleId = r.id
      JOIN ApprovalRequests ar ON h.requestId = ar.id
      ${where}
      ORDER BY h.createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `, { ...params, offset, pageSize });

    return { items, total: countRows[0]?.total || 0 };
  },

  async create({ requestId, action, fromStatus, toStatus, performedBy, comment }) {
    const rows = query(`
      INSERT INTO ApprovalHistory (requestId, action, fromStatus, toStatus, performedBy, comment)
      OUTPUT INSERTED.*
      VALUES (@reqId, @action, @fromStatus, @toStatus, @perfBy, @comment)
    `, { reqId: requestId, action, fromStatus: fromStatus || null, toStatus: toStatus || null, perfBy: performedBy, comment: comment || null });
    return rows[0];
  },

  async createWithTransaction(tx, { requestId, action, fromStatus, toStatus, performedBy, comment }) {
    tx.add(`
      INSERT INTO ApprovalHistory (requestId, action, fromStatus, toStatus, performedBy, comment)
      VALUES (@reqId, @action, @fromStatus, @toStatus, @perfBy, @comment)
    `, { reqId: requestId, action, fromStatus: fromStatus || null, toStatus: toStatus || null, perfBy: performedBy, comment: comment || null });
  },
};

module.exports = historyRepository;
