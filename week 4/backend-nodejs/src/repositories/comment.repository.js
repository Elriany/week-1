const { query } = require('../config/dbQuery');

const commentRepository = {
  async findByRequestId(requestId) {
    const sql = `
      SELECT c.*, u.firstName AS authorFirstName, u.lastName AS authorLastName, 
             u.email AS authorEmail, r.name AS authorRole
      FROM ApprovalComments c
      JOIN Users u ON c.authorId = u.id
      JOIN Roles r ON u.roleId = r.id
      WHERE c.requestId = @requestId
      ORDER BY c.createdAt ASC
    `;
    return query(sql, { requestId });
  },

  async create({ requestId, authorId, comment }) {
    const sql = `
      INSERT INTO ApprovalComments (requestId, authorId, comment)
      VALUES (@requestId, @authorId, @comment);
      SELECT TOP 1 * FROM ApprovalComments WHERE id = SCOPE_IDENTITY();
    `;
    const rows = query(sql, { requestId, authorId, comment });
    return rows[0];
  },

  async createWithTransaction(tx, { requestId, authorId, comment }) {
    tx.add(`
      INSERT INTO ApprovalComments (requestId, authorId, comment)
      VALUES (@requestId, @authorId, @comment)
    `, { requestId, authorId, comment });
  },
};

module.exports = commentRepository;
