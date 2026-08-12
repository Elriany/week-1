const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./environment');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ApprovalFlow — Approval Workflow Management API',
    version: '1.0.0',
    description:
      'Enterprise Approval Workflow Management System API.\n\n' +
      '**Authentication**: All protected endpoints require `Authorization: Bearer <token>` header.\n\n' +
      '**Roles**: ADMIN, MANAGER, EMPLOYEE\n\n' +
      '**Demo Accounts** (Password: `Password123!`):\n' +
      '- Admin: `admin@approval.local`\n' +
      '- IT Manager: `manager.it@approval.local`\n' +
      '- IT Employee: `employee.it1@approval.local`',
  },
  servers: [
    { url: `http://localhost:${env.PORT}/api/v1`, description: 'Local Development' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ BearerAuth: [] }],
};

const options = {
  swaggerDefinition,
  apis: [], // We define paths inline below since no JSDoc annotations
};

const swaggerSpec = swaggerJsdoc(options);

// Manually add paths for comprehensive documentation
swaggerSpec.paths = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check',
      security: [],
      responses: { 200: { description: 'API is running' } },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Login with email and password',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', example: 'admin@approval.local' },
                password: { type: 'string', example: 'Password123!' },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Login successful' }, 401: { description: 'Invalid credentials' } },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Authentication'],
      summary: 'Get current user profile',
      responses: { 200: { description: 'Current user data' } },
    },
  },
  '/dashboard': {
    get: {
      tags: ['Dashboard'],
      summary: 'Get role-aware dashboard data',
      responses: { 200: { description: 'Dashboard KPIs and activity' } },
    },
  },
  '/departments': {
    get: {
      tags: ['Departments'],
      summary: 'List all departments (Admin)',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Paginated departments' } },
    },
    post: {
      tags: ['Departments'],
      summary: 'Create department (Admin)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['code', 'name'],
              properties: {
                code: { type: 'string', example: 'MKT' },
                name: { type: 'string', example: 'Marketing' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { 201: { description: 'Department created' } },
    },
  },
  '/departments/{id}': {
    get: { tags: ['Departments'], summary: 'Get department by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Department details' } } },
    put: { tags: ['Departments'], summary: 'Update department', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Department updated' } } },
  },
  '/employees': {
    get: { tags: ['Employees'], summary: 'List employees (Admin: all, Manager: own department)', responses: { 200: { description: 'Paginated employees' } } },
    post: { tags: ['Employees'], summary: 'Add employee to department (Manager)', responses: { 201: { description: 'Employee created' } } },
  },
  '/employees/{id}': {
    get: { tags: ['Employees'], summary: 'Get employee details', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Employee details' } } },
  },
  '/employees/{id}/activation-request': {
    post: { tags: ['Employees'], summary: 'Request employee activation (Manager)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 201: { description: 'Activation request created' } } },
  },
  '/employees/{id}/deactivation-request': {
    post: { tags: ['Employees'], summary: 'Request employee deactivation (Manager)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 201: { description: 'Deactivation request created' } } },
  },
  '/managers': {
    get: { tags: ['Managers'], summary: 'List managers (Admin)', responses: { 200: { description: 'Paginated managers' } } },
    post: { tags: ['Managers'], summary: 'Create manager (Admin)', responses: { 201: { description: 'Manager created' } } },
  },
  '/managers/{id}': {
    put: { tags: ['Managers'], summary: 'Update manager (Admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Manager updated' } } },
  },
  '/requests': {
    get: { tags: ['Approval Requests'], summary: 'List requests (role-filtered)', responses: { 200: { description: 'Paginated requests' } } },
    post: { tags: ['Approval Requests'], summary: 'Create approval request', responses: { 201: { description: 'Request created' } } },
  },
  '/requests/{id}': {
    get: { tags: ['Approval Requests'], summary: 'Get request details', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Request details' } } },
  },
  '/requests/{id}/submit': { post: { tags: ['Approval Requests'], summary: 'Submit draft request', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Request submitted' } } } },
  '/requests/{id}/approve': { post: { tags: ['Approval Requests'], summary: 'Approve request', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Request approved' } } } },
  '/requests/{id}/reject': { post: { tags: ['Approval Requests'], summary: 'Reject request (comment required)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Request rejected' } } } },
  '/requests/{id}/resubmit': { post: { tags: ['Approval Requests'], summary: 'Resubmit rejected request', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Request resubmitted' } } } },
  '/requests/{id}/cancel': { post: { tags: ['Approval Requests'], summary: 'Cancel request', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Request cancelled' } } } },
  '/requests/{id}/comments': {
    get: { tags: ['Comments'], summary: 'Get request comments', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Comments list' } } },
    post: { tags: ['Comments'], summary: 'Add comment to request', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 201: { description: 'Comment added' } } },
  },
  '/requests/{id}/history': {
    get: { tags: ['History'], summary: 'Get request history/timeline', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'History entries' } } },
  },
  '/status-requests': {
    get: { tags: ['Status Requests'], summary: 'List employee status requests (Admin)', responses: { 200: { description: 'Paginated status requests' } } },
  },
  '/status-requests/{id}/approve': { post: { tags: ['Status Requests'], summary: 'Approve status change (Admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Status change approved' } } } },
  '/status-requests/{id}/reject': { post: { tags: ['Status Requests'], summary: 'Reject status change (Admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Status change rejected' } } } },
  '/audit/history': {
    get: { tags: ['Audit'], summary: 'Global audit history (Admin)', responses: { 200: { description: 'Paginated audit trail' } } },
  },
};

module.exports = swaggerSpec;
