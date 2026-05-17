const request = require('supertest');
const { resetDomainData } = require('./helpers');
const { app } = require('../src/index');

describe('auth routes', () => {
  beforeEach(async () => {
    await resetDomainData();
  });

  test('POST /api/auth/login with valid credentials returns token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'adminpass123' });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({ email: 'admin@test.local', role: 'admin', legal_role: 'solicitor_on_record' });
  });

  test('POST /api/auth/login with wrong password returns 401', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'wrong-password' });

    expect(response.status).toBe(401);
  });

  test('POST /api/auth/login with unknown email returns 401', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@test.local', password: 'anything' });

    expect(response.status).toBe(401);
  });

  test('POST /api/auth/register without admin token returns 401', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New User', email: 'new@test.local', password: 'secret123', role: 'user' });

    expect(response.status).toBe(401);
  });

  test('POST /api/auth/register with admin token returns created user without password hash', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${global.testContext.adminToken}`)
      .send({ name: 'New User', email: 'new@test.local', password: 'secret123', role: 'user', legal_role: 'internal_fee_earner' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'New User', email: 'new@test.local', role: 'user', legal_role: 'internal_fee_earner' });
    expect(response.body.password_hash).toBeUndefined();
  });

  test('POST /api/auth/register duplicate email returns 409', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${global.testContext.adminToken}`)
      .send({ name: 'Dup User', email: 'user1@test.local', password: 'secret123', role: 'user' });

    expect(response.status).toBe(409);
  });
});
