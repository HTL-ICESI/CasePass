const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function splitStatements(schema) {
  return schema
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function runMigration(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run migrations.');
  }

  const pool = new Pool({ connectionString });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const statements = splitStatements(schema);

    for (const statement of statements) {
      const preview = statement.split('\n')[0].slice(0, 120);
      const result = await pool.query(statement);
      console.log(`[migrate] ok :: ${preview} :: rowCount=${result.rowCount}`);
    }

    await pool.end();
    return true;
  } catch (error) {
    console.error('[migrate] failed', error.message);
    await pool.end();
    throw error;
  }
}

async function main() {
  try {
    await runMigration(process.env.DATABASE_URL);
    process.exit(0);
  } catch (_error) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runMigration,
  splitStatements,
};
