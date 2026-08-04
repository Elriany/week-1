const request = require('supertest');
const app = require('../src/app');

describe('Health Check Endpoint', () => {
  it('GET /api/v1/health should return 200 OK and health status with metadata', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message');
    expect(res.body.data).toHaveProperty('status', 'UP');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toHaveProperty('correlationId');
    expect(res.headers).toHaveProperty('x-correlation-id');
  });
});
