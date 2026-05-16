const request = require('supertest');
const { resetDomainData } = require('./helpers');
const { app } = require('../src/index');
const { query } = require('../src/db');

describe('admin routes', () => {
  beforeEach(async () => {
    await resetDomainData();
    await query('UPDATE users SET active = TRUE');
  });

  test('GET /api/users only for admin and without password_hash', async () => {
    const forbidden = await request(app).get('/api/users').set('Authorization', `Bearer ${global.testContext.user1Token}`);
    const allowed = await request(app).get('/api/users').set('Authorization', `Bearer ${global.testContext.adminToken}`);

    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(Array.isArray(allowed.body)).toBe(true);
    expect(allowed.body[0].password_hash).toBeUndefined();
  });

  test('PUT /api/users/:id/active toggles only for admin', async () => {
    const forbidden = await request(app)
      .put(`/api/users/${global.testContext.user2.id}/active`)
      .set('Authorization', `Bearer ${global.testContext.user1Token}`)
      .send({ active: false });

    const disable = await request(app)
      .put(`/api/users/${global.testContext.user2.id}/active`)
      .set('Authorization', `Bearer ${global.testContext.adminToken}`)
      .send({ active: false });

    const enable = await request(app)
      .put(`/api/users/${global.testContext.user2.id}/active`)
      .set('Authorization', `Bearer ${global.testContext.adminToken}`)
      .send({ active: true });

    expect(forbidden.status).toBe(403);
    expect(disable.status).toBe(200);
    expect(enable.status).toBe(200);
  });
});
