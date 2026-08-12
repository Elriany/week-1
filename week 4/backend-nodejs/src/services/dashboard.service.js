const { query } = require('../config/dbQuery');
const ROLES = require('../constants/roles');

const dashboardService = {
  async getDashboard(user) {
    if (user.role === ROLES.ADMIN) {
      return this.getAdminDashboard();
    }
    if (user.role === ROLES.MANAGER) {
      return this.getManagerDashboard(user);
    }
    return this.getEmployeeDashboard(user);
  },

  async getAdminDashboard() {
    const deptCount = query("SELECT COUNT(*) AS cnt FROM Departments")[0]?.cnt || 0;
    const mgrCount = query("SELECT COUNT(*) AS cnt FROM Users u JOIN Roles r ON u.roleId = r.id WHERE r.name = 'MANAGER'")[0]?.cnt || 0;
    const empCount = query("SELECT COUNT(*) AS cnt FROM Users u JOIN Roles r ON u.roleId = r.id WHERE r.name = 'EMPLOYEE'")[0]?.cnt || 0;
    const pendingAppr = query("SELECT COUNT(*) AS cnt FROM ApprovalRequests WHERE status = 'PENDING_ADMIN'")[0]?.cnt || 0;
    const pendingStatus = query("SELECT COUNT(*) AS cnt FROM EmployeeStatusRequests WHERE status = 'PENDING'")[0]?.cnt || 0;

    const recentActivity = query(`
      SELECT TOP 10 h.*, u.firstName AS performerFirstName, u.lastName AS performerLastName,
             r.name AS performerRole, ar.requestNumber, ar.title AS requestTitle
      FROM ApprovalHistory h
      JOIN Users u ON h.performedBy = u.id
      JOIN Roles r ON u.roleId = r.id
      JOIN ApprovalRequests ar ON h.requestId = ar.id
      ORDER BY h.createdAt DESC
    `);

    return {
      role: 'ADMIN',
      stats: {
        departmentCount: deptCount,
        managerCount: mgrCount,
        employeeCount: empCount,
        pendingApprovals: pendingAppr,
        pendingStatusRequests: pendingStatus,
      },
      recentActivity,
    };
  },

  async getManagerDashboard(user) {
    const deptId = user.departmentId || 0;
    const mgrId = user.id;

    const deptEmps = query("SELECT COUNT(*) AS cnt FROM Users u JOIN Roles r ON u.roleId = r.id WHERE u.departmentId = @deptId AND r.name = 'EMPLOYEE'", { deptId })[0]?.cnt || 0;
    const pendingRev = query("SELECT COUNT(*) AS cnt FROM ApprovalRequests ar JOIN Users req ON ar.requesterId = req.id JOIN Roles reqR ON req.roleId = reqR.id WHERE req.departmentId = @deptId AND reqR.name = 'EMPLOYEE' AND ar.status = 'PENDING_MANAGER'", { deptId })[0]?.cnt || 0;
    const myReqs = query("SELECT COUNT(*) AS cnt FROM ApprovalRequests WHERE requesterId = @mgrId", { mgrId })[0]?.cnt || 0;
    const pendingStatus = query("SELECT COUNT(*) AS cnt FROM EmployeeStatusRequests WHERE requestedBy = @mgrId AND status = 'PENDING'", { mgrId })[0]?.cnt || 0;

    const recentActivity = query(`
      SELECT TOP 10 h.*, u.firstName AS performerFirstName, u.lastName AS performerLastName,
             r.name AS performerRole, ar.requestNumber, ar.title AS requestTitle
      FROM ApprovalHistory h
      JOIN Users u ON h.performedBy = u.id
      JOIN Roles r ON u.roleId = r.id
      JOIN ApprovalRequests ar ON h.requestId = ar.id
      WHERE ar.requesterId = @mgrId 
        OR (ar.requesterId IN (SELECT id FROM Users WHERE departmentId = @deptId))
      ORDER BY h.createdAt DESC
    `, { mgrId, deptId });

    return {
      role: 'MANAGER',
      stats: {
        departmentEmployees: deptEmps,
        pendingReviews: pendingRev,
        myRequests: myReqs,
        pendingStatusRequests: pendingStatus,
      },
      recentActivity,
    };
  },

  async getEmployeeDashboard(user) {
    const userId = user.id;

    const totalReqs = query("SELECT COUNT(*) AS cnt FROM ApprovalRequests WHERE requesterId = @userId", { userId })[0]?.cnt || 0;
    const pendingReqs = query("SELECT COUNT(*) AS cnt FROM ApprovalRequests WHERE requesterId = @userId AND status IN ('PENDING_MANAGER', 'PENDING_ADMIN')", { userId })[0]?.cnt || 0;
    const approvedReqs = query("SELECT COUNT(*) AS cnt FROM ApprovalRequests WHERE requesterId = @userId AND status = 'APPROVED'", { userId })[0]?.cnt || 0;
    const rejectedReqs = query("SELECT COUNT(*) AS cnt FROM ApprovalRequests WHERE requesterId = @userId AND status = 'REJECTED'", { userId })[0]?.cnt || 0;

    const recentActivity = query(`
      SELECT TOP 10 h.*, u.firstName AS performerFirstName, u.lastName AS performerLastName,
             r.name AS performerRole, ar.requestNumber, ar.title AS requestTitle
      FROM ApprovalHistory h
      JOIN Users u ON h.performedBy = u.id
      JOIN Roles r ON u.roleId = r.id
      JOIN ApprovalRequests ar ON h.requestId = ar.id
      WHERE ar.requesterId = @userId
      ORDER BY h.createdAt DESC
    `, { userId });

    return {
      role: 'EMPLOYEE',
      stats: {
        totalRequests: totalReqs,
        pendingRequests: pendingReqs,
        approvedRequests: approvedReqs,
        rejectedRequests: rejectedReqs,
      },
      recentActivity,
    };
  },
};

module.exports = dashboardService;
