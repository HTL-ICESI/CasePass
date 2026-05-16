const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const { runMigration } = require('../src/db/migrate');

dotenv.config({ path: path.join(__dirname, '../.env.test') });

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

const dbUrl = new URL(process.env.DATABASE_URL_TEST);
const adminDatabaseUrl = new URL(process.env.DATABASE_URL_TEST);
adminDatabaseUrl.pathname = '/postgres';

async function ensureDatabaseExists() {
  const client = new Client({ connectionString: adminDatabaseUrl.toString() });
  await client.connect();

  try {
    const databaseName = dbUrl.pathname.replace('/', '');
    const check = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
    if (!check.rows[0]) {
      await client.query(`CREATE DATABASE ${databaseName}`);
    }
  } finally {
    await client.end();
  }
}

async function resetSchema() {
  const client = new Client({ connectionString: process.env.DATABASE_URL_TEST });
  await client.connect();

  try {
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
  } finally {
    await client.end();
  }
}

async function seedUsers() {
  const { query } = require('../src/db');
  const passwordHash = await bcrypt.hash('adminpass123', 12);
  const userPasswordHash = await bcrypt.hash('userpass123', 12);
  const user2PasswordHash = await bcrypt.hash('user2pass123', 12);

  const admin = (await query(
    `
      INSERT INTO users (name, email, password_hash, role, legal_role, active)
      VALUES ($1, $2, $3, 'admin', 'solicitor_on_record', TRUE)
      RETURNING id, name, email, role, legal_role, active, created_at
    `,
    ['Admin User', 'admin@test.local', passwordHash],
  )).rows[0];

  const user1 = (await query(
    `
      INSERT INTO users (name, email, password_hash, role, legal_role, active)
      VALUES ($1, $2, $3, 'user', 'solicitor_on_record', TRUE)
      RETURNING id, name, email, role, legal_role, active, created_at
    `,
    ['User One', 'user1@test.local', userPasswordHash],
  )).rows[0];

  const user2 = (await query(
    `
      INSERT INTO users (name, email, password_hash, role, legal_role, active)
      VALUES ($1, $2, $3, 'user', 'advocate_hearing_only', TRUE)
      RETURNING id, name, email, role, legal_role, active, created_at
    `,
    ['User Two', 'user2@test.local', user2PasswordHash],
  )).rows[0];

  global.testContext = {
    admin,
    user1,
    user2,
    adminToken: jwt.sign({ id: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '7d' }),
    user1Token: jwt.sign({ id: user1.id, role: user1.role }, process.env.JWT_SECRET, { expiresIn: '7d' }),
    user2Token: jwt.sign({ id: user2.id, role: user2.role }, process.env.JWT_SECRET, { expiresIn: '7d' }),
  };
}

beforeAll(async () => {
  await ensureDatabaseExists();
  await resetSchema();
  await runMigration(process.env.DATABASE_URL_TEST);
  await seedUsers();
});

afterAll(async () => {
  const { pool } = require('../src/db');
  const client = new Client({ connectionString: process.env.DATABASE_URL_TEST });
  await client.connect();
  try {
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
  } finally {
    await client.end();
  }
  await pool.end();
});
