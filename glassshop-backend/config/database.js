const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME     || 'glass_shop',
  process.env.DB_USERNAME || 'postgres',
  process.env.DB_PASSWORD || '',
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
