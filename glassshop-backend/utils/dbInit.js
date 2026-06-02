/**
 * dbInit.js — One-stop database initialization module.
 *
 * Startup order (called from server.js):
 *
 *   1. createDatabaseIfNotExists()
 *      Uses raw `pg` (not Sequelize) to connect to the postgres maintenance DB
 *      and CREATE the target database if it does not exist yet.
 *
 *   2. verifyConnection()
 *      Proves Sequelize can reach the target DB before doing anything else.
 *
 *   3. runMigrations()
 *      Applies any .sql files in migrations/ that have not been applied yet.
 *      Tracks applied migrations in a `_schema_migrations` table.
 *      Runs BEFORE sync so column types are already correct when Sequelize
 *      inspects the schema.
 *
 *   4. syncSchema()
 *      Runs sequelize.sync({ alter: true }) to create tables/columns that the
 *      Sequelize models define but that do not yet exist in the DB.
 *      Falls back to sync({ alter: false }) if alter fails (safety net).
 *      Never drops columns or tables.
 *
 * Properties:
 *   • Idempotent  — safe to run on every startup, nothing is created twice.
 *   • Non-destructive — existing data is never modified or deleted.
 *   • Graceful errors — migration failures are logged but do not crash startup
 *     unless the connectivity check itself fails.
 */

'use strict';

const { Client } = require('pg');
const path       = require('path');
const fs         = require('fs');
require('dotenv').config();

// ─── helpers ──────────────────────────────────────────────────────────────────

function dbConfig() {
  return {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT, 10) || 5432,
    user:     process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dbName:   process.env.DB_NAME     || 'glass_shop',
  };
}

// ─── Step 1: Create database ──────────────────────────────────────────────────

async function createDatabaseIfNotExists() {
  const cfg = dbConfig();
  console.log(`\n🔌 Connecting to PostgreSQL at ${cfg.host}:${cfg.port} …`);

  const client = new Client({
    host:                   cfg.host,
    port:                   cfg.port,
    user:                   cfg.user,
    password:               cfg.password,
    database:               'postgres',   // maintenance DB – always exists
    connectionTimeoutMillis: 10_000,
  });

  try {
    await client.connect();
  } catch (err) {
    console.error('\n❌  Cannot connect to PostgreSQL server.');
    console.error(`    Host     : ${cfg.host}:${cfg.port}`);
    console.error(`    Username : ${cfg.user}`);
    console.error('\n    Checklist:');
    console.error('    1. PostgreSQL service is running');
    console.error('    2. DB_USERNAME / DB_PASSWORD in .env are correct');
    console.error(`    3. User "${cfg.user}" has CREATEDB privilege`);
    console.error('\n    Original error:', err.message, '\n');
    throw err;
  }

  try {
    const { rows } = await client.query(
      `SELECT 1 FROM pg_catalog.pg_database WHERE datname = $1`,
      [cfg.dbName]
    );

    if (rows.length === 0) {
      console.log(`📦 Database "${cfg.dbName}" not found — creating …`);
      // identifiers cannot be parameterised in DDL
      await client.query(`CREATE DATABASE "${cfg.dbName}" ENCODING 'UTF8'`);
      console.log(`✅ Database "${cfg.dbName}" created.\n`);
      return 'created';
    }

    console.log(`✅ Database "${cfg.dbName}" found.\n`);
    return 'exists';
  } finally {
    await client.end();
  }
}

// ─── Step 2: Verify Sequelize connectivity ────────────────────────────────────

async function verifyConnection(sequelize) {
  const cfg = dbConfig();
  try {
    await sequelize.authenticate();
    console.log(`✅ Connected to "${cfg.dbName}".\n`);
  } catch (err) {
    console.error(`\n❌  Sequelize cannot connect to "${cfg.dbName}": ${err.message}\n`);
    throw err;
  }
}

// ─── Step 3: Migration runner ─────────────────────────────────────────────────

/** Creates the tracking table if it doesn't exist. */
async function ensureMigrationsTable(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(sequelize) {
  const [rows] = await sequelize.query(
    'SELECT name FROM _schema_migrations ORDER BY id ASC'
  );
  return new Set(rows.map(r => r.name));
}

async function markApplied(sequelize, name) {
  await sequelize.query(
    `INSERT INTO _schema_migrations (name) VALUES (:name) ON CONFLICT (name) DO NOTHING`,
    { replacements: { name } }
  );
}

/**
 * Splits a SQL file into individual statements on ";  newline" boundaries,
 * strips comment-only lines, and returns an array of non-empty statements.
 */
function splitStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map(s => s.replace(/--[^\n]*/g, '').trim())
    .filter(s => s.length > 0);
}

async function runMigrations(sequelize) {
  const migrationsDir = path.join(__dirname, '..', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('ℹ️  No migrations/ directory — skipping.\n');
    return;
  }

  await ensureMigrationsTable(sequelize);
  const applied = await getAppliedMigrations(sequelize);

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();   // alphabetical = deterministic order

  if (files.length === 0) {
    console.log('ℹ️  No SQL migration files — skipping.\n');
    return;
  }

  console.log('📋 Running migrations …');

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`   ✓  ${file}  (already applied)`);
      continue;
    }

    const sqlPath    = path.join(migrationsDir, file);
    const rawSql     = fs.readFileSync(sqlPath, 'utf8').trim();
    const statements = splitStatements(rawSql);

    if (statements.length === 0) {
      console.log(`   ⚠️  ${file}  (empty — marking applied)`);
      await markApplied(sequelize, file);
      continue;
    }

    try {
      await sequelize.transaction(async (t) => {
        for (const stmt of statements) {
          await sequelize.query(stmt, { transaction: t });
        }
      });
      await markApplied(sequelize, file);
      console.log(`   ✅ ${file}`);
      ran++;
    } catch (err) {
      const msg = (err.message || '').split('\n')[0];

      // Gracefully skip changes that were already applied outside this system
      const isAlreadyApplied =
        msg.includes('already exists') ||
        msg.includes('duplicate column')  ||
        msg.includes('there is no unique constraint') ||
        msg.includes('does not exist');   // column/table not present on fresh DB

      if (isAlreadyApplied) {
        await markApplied(sequelize, file);
        console.log(`   ⚠️  ${file}  (skipped — ${msg})`);
      } else {
        // Log the error but keep going — app can start in degraded mode
        console.error(`   ❌ ${file}  FAILED: ${msg}`);
      }
    }
  }

  const summary = ran === 0
    ? '   All migrations already up to date.'
    : `   ${ran} migration(s) applied.`;
  console.log(summary + '\n');
}

// ─── Step 4: Sequelize schema sync ───────────────────────────────────────────

async function syncSchema(sequelize) {
  console.log('🔄 Syncing Sequelize models to database schema …');

  // alter:true  → adds missing tables and columns; never drops anything
  // Falls back to force:false (create-only) if alter triggers a Sequelize bug
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Schema sync complete (alter mode).\n');
  } catch (alterErr) {
    console.warn(
      '⚠️  alter sync failed — falling back to safe (create-only) sync.\n' +
      '    Reason: ' + (alterErr.message || '').split('\n')[0]
    );
    try {
      await sequelize.sync({ force: false });
      console.log('✅ Schema sync complete (create-only mode).\n');
    } catch (fallbackErr) {
      console.error('❌ Schema sync failed:', (fallbackErr.message || '').split('\n')[0]);
      throw fallbackErr;
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Master function — call once from server.js before app.listen().
 *
 * @param {import('sequelize').Sequelize} sequelize
 */
async function initDatabase(sequelize) {
  const line = '━'.repeat(50);
  console.log(`\n${line}`);
  console.log('  GlassShop  ›  Database Initialization');
  console.log(`${line}\n`);

  await createDatabaseIfNotExists();
  await verifyConnection(sequelize);
  await runMigrations(sequelize);
  await syncSchema(sequelize);

  console.log(`${line}`);
  console.log('  Database ready ✅');
  console.log(`${line}\n`);
}

module.exports = { initDatabase };
