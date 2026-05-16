const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://casepass:casepass@localhost:5432/casepass';

const pool = new Pool({ connectionString });

async function query(text, params = []) {
  return pool.query(text, params);
}

async function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Database schema applied successfully.');
  await pool.end();
}

module.exports = {
  pool,
  query,
  runMigrations,
};
