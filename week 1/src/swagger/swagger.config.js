const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config/env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Approval Management API',
      version: '1.0.0',
      description:
        'A comprehensive beginner-friendly RESTful API demonstrating Week 1 Engineering Foundation concepts: JWT Authentication, Role-based Authorization, In-Memory Data Storage, Middleware, and OpenAPI Documentation.',
      contact: {
        name: 'Algoriza Technical Team',
        email: 'support@algoriza.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT Bearer token in the format: Bearer <token>',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'usr-3' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'employee@example.com' },
            role: { type: 'string', example: 'Employee', enum: ['Admin', 'Manager', 'Employee'] },
            createdAt: { type: 'string', format: 'date-time', example: '2026-01-03T10:00:00.000Z' },
          },
        },
        Approval: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'req-101' },
            title: { type: 'string', example: 'MacBook Pro Purchase Request' },
            description: {
              type: 'string',
              example: 'Hardware upgrade for senior developer setup and performance testing.',
            },
            requesterId: { type: 'string', example: 'usr-3' },
            status: {
              type: 'string',
              example: 'PENDING',
              enum: ['PENDING', 'APPROVED', 'REJECTED'],
            },
            createdAt: { type: 'string', format: 'date-time', example: '2026-02-01T10:30:00.000Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-02-01T10:30:00.000Z' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'employee@example.com' },
            password: { type: 'string', example: 'employee123' },
          },
        },
        ApprovalCreateRequest: {
          type: 'object',
          required: ['title', 'description'],
          properties: {
            title: { type: 'string', example: 'AWS Cloud Training Course' },
            description: {
              type: 'string',
              example: 'Request approval for annual cloud engineering certification exam voucher.',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully.' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            status: { type: 'integer', example: 400 },
            message: { type: 'string', example: 'Validation failed.' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Please provide a valid email address.' },
                },
              },
            },
          },
        },
      },
    },
    paths: {
      '/api/v1/health': {
        get: {
          tags: ['Health'],
          summary: 'Health Check Endpoint',
          description: 'Returns server operational status and uptime.',
          responses: {
            200: {
              description: 'API is operational.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessResponse' },
                },
              },
            },
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User Login Endpoint',
          description: 'Authenticate user with email and password to receive a JWT Bearer token.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful, returns JWT token.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessResponse' },
                },
              },
            },
            401: {
              description: 'Invalid credentials.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/v1/users': {
        get: {
          tags: ['Users'],
          summary: 'Get List of Users',
          description: 'Retrieve all users. Accessible by Admin and Manager roles.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of users.' },
            401: { description: 'Unauthorized.' },
            403: { description: 'Forbidden.' },
          },
        },
      },
      '/api/v1/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Get User by ID',
          description: 'Retrieve specific user details. Employees can only view their own user account.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              example: 'usr-3',
            },
          ],
          responses: {
            200: { description: 'User profile.' },
            403: { description: 'Forbidden (Employees trying to view another user).' },
            404: { description: 'User not found.' },
          },
        },
      },
      '/api/v1/approvals': {
        get: {
          tags: ['Approvals'],
          summary: 'List Approvals (Search, Filter, Sort, Paginate)',
          description: 'Retrieve approval requests. Employees see own requests; Managers & Admins see all requests.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] } },
            { name: 'requesterId', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'sort', in: 'query', schema: { type: 'string', default: 'createdAt' } },
            { name: 'sortDirection', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
          ],
          responses: {
            200: { description: 'Paginated list of approvals.' },
            401: { description: 'Unauthorized.' },
          },
        },
        post: {
          tags: ['Approvals'],
          summary: 'Create Approval Request',
          description: 'Submit a new approval request.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApprovalCreateRequest' },
              },
            },
          },
          responses: {
            201: { description: 'Approval request created successfully.' },
            400: { description: 'Validation error.' },
            401: { description: 'Unauthorized.' },
          },
        },
      },
      '/api/v1/approvals/{id}': {
        get: {
          tags: ['Approvals'],
          summary: 'Get Approval by ID',
          description: 'Retrieve single approval details.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Approval request details.' },
            403: { description: 'Forbidden.' },
            404: { description: 'Not Found.' },
          },
        },
        put: {
          tags: ['Approvals'],
          summary: 'Update Approval Request',
          description: 'Update title or description. Employees can only update their own request while PENDING.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApprovalCreateRequest' },
              },
            },
          },
          responses: {
            200: { description: 'Approval request updated.' },
            403: { description: 'Forbidden.' },
            404: { description: 'Not Found.' },
          },
        },
        delete: {
          tags: ['Approvals'],
          summary: 'Delete Approval Request',
          description: 'Delete approval request. Employees can delete own request if PENDING; Admins can delete any.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Approval request deleted.' },
            403: { description: 'Forbidden.' },
            404: { description: 'Not Found.' },
          },
        },
      },
      '/api/v1/approvals/{id}/approve': {
        post: {
          tags: ['Approvals'],
          summary: 'Approve Request',
          description: 'Approve an approval request. Accessible by Manager and Admin.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Status changed to APPROVED.' },
            403: { description: 'Forbidden (Employees).' },
            404: { description: 'Not Found.' },
          },
        },
      },
      '/api/v1/approvals/{id}/reject': {
        post: {
          tags: ['Approvals'],
          summary: 'Reject Request',
          description: 'Reject an approval request. Accessible by Manager and Admin.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Status changed to REJECTED.' },
            403: { description: 'Forbidden (Employees).' },
            404: { description: 'Not Found.' },
          },
        },
      },
    },
  },
  apis: [], // All specs defined explicitly in configuration object for reliability
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
