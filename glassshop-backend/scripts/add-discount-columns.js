/**
 * Script to add discount_type and discount_value columns to quotations table
 * Run this with: node scripts/add-discount-columns.js
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'shop_class',
  process.env.DB_USERNAME || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log
  }
);

async function addDiscountColumns() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Check if columns exist and add them if they don't
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'quotations' 
      AND column_name IN ('discount_type', 'discount_value')
    `);

    const existingColumns = results.map(r => r.column_name);
    
    if (!existingColumns.includes('discount_type')) {
      console.log('Adding discount_type column...');
      await sequelize.query(`
        ALTER TABLE quotations 
        ADD COLUMN discount_type VARCHAR(20) DEFAULT 'AMOUNT'
      `);
      console.log('✅ Added discount_type column');
    } else {
      console.log('✅ discount_type column already exists');
    }

    if (!existingColumns.includes('discount_value')) {
      console.log('Adding discount_value column...');
      await sequelize.query(`
        ALTER TABLE quotations 
        ADD COLUMN discount_value DECIMAL(10, 2) DEFAULT 0.0
      `);
      console.log('✅ Added discount_value column');
    } else {
      console.log('✅ discount_value column already exists');
    }

    // Update existing rows
    console.log('Updating existing rows...');
    await sequelize.query(`
      UPDATE quotations 
      SET discount_type = 'AMOUNT', 
          discount_value = COALESCE(discount, 0)
      WHERE discount_type IS NULL OR discount_value IS NULL
    `);
    console.log('✅ Updated existing rows');

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addDiscountColumns();

