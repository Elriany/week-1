const request = require('supertest');
const app = require('../src/app');

describe('Authentication API Endpoint', () => {
  it('POST /api/v1/auth/login should return 200 and JWT token on valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'employee@example.com',
      password: 'employee123',
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('role', 'Employee');
    expect(res.body).toHaveProperty('meta');
  });

  it('POST /api/v1/auth/login should return 401 on incorrect password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'employee@example.com',
      password: 'wrongpassword',
    });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
  });

  it('POST /api/v1/auth/login should return 400 when email is invalid', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'invalid-email-format',
      password: 'somepassword',
    });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('errors');
  });
});
