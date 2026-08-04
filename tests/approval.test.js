const request = require('supertest');
const app = require('../src/app');

describe('Approvals API Endpoints', () => {
  let employeeToken;
  let managerToken;

  beforeAll(async () => {
    const empRes = await request(app).post('/api/v1/auth/login').send({
      email: 'employee@example.com',
      password: 'employee123',
    });
    employeeToken = empRes.body.data.token;

    const mgrRes = await request(app).post('/api/v1/auth/login').send({
      email: 'manager@example.com',
      password: 'manager123',
    });
    managerToken = mgrRes.body.data.token;
  });

  it('GET /api/v1/approvals should return 401 Unauthorized without token', async () => {
    const res = await request(app).get('/api/v1/approvals');
    expect(res.statusCode).toEqual(401);
  });

  it('GET /api/v1/approvals should return 200 and filtered list with Employee token', async () => {
    const res = await request(app)
      .get('/api/v1/approvals')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('approvals');
    expect(Array.isArray(res.body.data.approvals)).toBe(true);
  });

  it('POST /api/v1/approvals should create a new request (201 Created)', async () => {
    const res = await request(app)
      .post('/api/v1/approvals')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'New Monitor Request',
        description: 'Dual monitor setup for backend development.',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('title', 'New Monitor Request');
    expect(res.body.data).toHaveProperty('status', 'PENDING');
    expect(res.body.data.id).toBeDefined();
  });

  it('POST /api/v1/approvals/:id/approve should return 403 Forbidden for Employee', async () => {
    const res = await request(app)
      .post('/api/v1/approvals/req-101/approve')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.statusCode).toEqual(403);
    expect(res.body).toHaveProperty('success', false);
  });

  it('POST /api/v1/approvals/:id/approve should return 200 OK for Manager', async () => {
    const res = await request(app)
      .post('/api/v1/approvals/req-101/approve')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('status', 'APPROVED');
  });
});
