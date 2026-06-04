const { Sequelize } = require('sequelize');
const path = require('path');

// Load .env from the backend root regardless of the working directory
// when the server is started (e.g. npm run dev from repo root vs. glassshop-backend/).
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME     || 'glass_shop',
  process.env.DB_USERNAME || 'postgres',
  // Do NOT fall back to '' — pg converts '' → null internally, which breaks
  // SCRAM-SHA-256 authentication with "client password must be a string".
  process.env.DB_PASSWORD || undefined,
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max:     10,
      min:     2,
      acquire: 30_000,
      idle:    10_000,
    },
    timezone: '+00:00',
  }
);

module.exports = sequelize;
