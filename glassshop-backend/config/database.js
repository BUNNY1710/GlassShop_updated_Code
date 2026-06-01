const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'glass_shop',
  process.env.DB_USERNAME || 'postgres',
  process.env.DB_PASSWORD || 'om',
  // process.env.DB_USERNAME || 'postgres',
  // process.env.DB_PASSWORD || 'temp@123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    timezone: '+00:00'
  }
);

module.exports = sequelize;
