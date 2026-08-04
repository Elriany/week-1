const bcrypt = require('bcryptjs');
const ROLES = require('../constants/roles');

/**
 * In-Memory Mock Users Database (JavaScript Array)
 */
const users = [
  {
    id: 'usr-1',
    name: 'System Admin',
    email: 'admin@example.com',
    password: bcrypt.hashSync('admin123', 10),
    role: ROLES.ADMIN,
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'usr-2',
    name: 'Sarah Jenkins',
    email: 'manager@example.com',
    password: bcrypt.hashSync('manager123', 10),
    role: ROLES.MANAGER,
    createdAt: '2026-01-02T09:00:00.000Z',
  },
  {
    id: 'usr-3',
    name: 'John Doe',
    email: 'employee@example.com',
    password: bcrypt.hashSync('employee123', 10),
    role: ROLES.EMPLOYEE,
    createdAt: '2026-01-03T10:00:00.000Z',
  },
  {
    id: 'usr-4',
    name: 'Alice Smith',
    email: 'alice@example.com',
    password: bcrypt.hashSync('employee123', 10),
    role: ROLES.EMPLOYEE,
    createdAt: '2026-01-04T11:00:00.000Z',
  },
];

module.exports = users;
