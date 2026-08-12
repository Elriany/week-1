const { query } = require('../config/dbQuery');

const commentRepository = {
  async findByRequestId(requestId) {
    const rows = query(`
      SELECT c.*, u.firstName AS authorFirstName, u.lastName AS authorLastName, 
             u.email AS authorEmail, r.name AS authorRole
      FROM ApprovalComments c
      JOIN Users u ON c.authorId = u.id
      JOIN Roles r ON u.roleId = r.id
      WHERE c.requestId = @reqId
      ORDER BY c.createdAt ASC
    `, { reqId: requestId });
    return rows;
  },

  async create({ requestId, authorId, comment }) {
    const rows = query(`
      INSERT INTO ApprovalComments (requestId, authorId, comment)
      OUTPUT INSERTED.*
      VALUES (@reqId, @authId, @comment)
    `, { reqId: requestId, authId: authorId, comment });
    return rows[0];
  },

  async createWithTransaction(tx, { requestId, authorId, comment }) {
    tx.add(`
      INSERT INTO ApprovalComments (requestId, authorId, comment)
      VALUES (@reqId, @authId, @comment)
    `, { reqId: requestId, authId: authorId, comment });
  },
};

module.exports = commentRepository;
