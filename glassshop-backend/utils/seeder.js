/**
 * seeder.js — Runs after schema sync on every startup.
 *
 * Always:
 *   • Creates the default Shop + admin user if they do not exist yet.
 *
 * Development / SEED_SAMPLE_DATA=true:
 *   • Creates one sample Architect, Customer, Glass, Stock, and
 *     GlassPriceMaster entry so a new developer can try every feature
 *     without needing to enter data manually.
 *
 * Safe to run multiple times — every write is guarded by findOrCreate.
 */

'use strict';

const bcrypt = require('bcryptjs');
const { Shop, User, Customer, Architect, Glass, Stock, GlassPriceMaster, GlassType, Stand } = require('../models');

// Default glass-type catalogue seeded for every shop.
const DEFAULT_GLASS_TYPES = [
  'Plain', 'Extra Clear', 'Grey Tinted', 'Brown Tinted', 'One Way',
  'Star', 'Karakachi', 'Bajari', 'Diomand', 'Mirror', 'Toughened', 'Lacquered',
];

// ─── default shop ─────────────────────────────────────────────────────────────

async function seedShop() {
  const [shop, created] = await Shop.findOrCreate({
    where:    { shopName: 'GlassShop Demo' },
    defaults: {
      shopName:       'GlassShop Demo',
      ownerName:      'Administrator',
      email:          'admin@glassshop.local',
      whatsappNumber: null,
    },
  });
  if (created) console.log('  ✅ Default shop created');
  return shop;
}

// ─── glass type master (always seeded for every shop) ───────────────────────────

async function seedGlassTypes(shopId) {
  for (const name of DEFAULT_GLASS_TYPES) {
    await GlassType.findOrCreate({
      where:    { shopId, name },
      defaults: { shopId, name, isActive: true },
    });
  }
}

// ─── stands master (default 1..5 for every shop) ───────────────────────────────

async function seedStands(shopId) {
  for (let n = 1; n <= 5; n++) {
    await Stand.findOrCreate({
      where:    { shopId, standNumber: n },
      defaults: { shopId, standNumber: n, isActive: true },
    });
  }
}

// ─── admin user ───────────────────────────────────────────────────────────────

async function seedAdmin(shopId) {
  const existing = await User.findOne({ where: { userName: 'admin' } });
  if (existing) return;

  const hashed = await bcrypt.hash('admin123', 10);
  await User.create({
    userName: 'admin',
    password: hashed,
    role:     'ROLE_ADMIN',
    shopId,
  });
  console.log('  ✅ Admin user created  (username: admin  /  password: admin123)');
}

// ─── sample data (dev / SEED_SAMPLE_DATA=true) ───────────────────────────────

async function seedSampleData(shopId) {
  // --- sample architect ---
  const [arch, archCreated] = await Architect.findOrCreate({
    where:    { shopId, name: 'Sample Architect' },
    defaults: {
      shopId,
      name:   'Sample Architect',
      mobile: '9876543210',
      email:  'architect@example.com',
      city:   'Mumbai',
      state:  'Maharashtra',
    },
  });
  if (archCreated) console.log('  ✅ Sample Architect created');

  // --- sample customer ---
  const [, custCreated] = await Customer.findOrCreate({
    where:    { shopId, name: 'Sample Customer' },
    defaults: {
      shopId,
      name:                 'Sample Customer',
      mobile:               '9876543211',
      email:                'customer@example.com',
      address:              '456 Sample Street',
      city:                 'Mumbai',
      state:                'Maharashtra',
      referenceArchitectId: arch.id,
    },
  });
  if (custCreated) console.log('  ✅ Sample Customer created');

  // --- sample glass (Glass has NO shopId — it is shared across shops) ---
  const [glass, glassCreated] = await Glass.findOrCreate({
    where:    { type: 'Plain', thickness: 5, unit: 'MM' },
    defaults: { type: 'Plain', thickness: 5, unit: 'MM' },
  });
  if (glassCreated) console.log('  ✅ Sample Glass created  (Plain 5MM)');

  // --- sample stock entry ---
  const [, stockCreated] = await Stock.findOrCreate({
    where:    { shopId, glassId: glass.id, standNo: 1 },
    defaults: {
      shopId,
      glassId:       glass.id,
      standNo:       1,
      height:        '60',
      width:         '36',
      quantity:      10,
      minQuantity:   5,
      status:        'APPROVED',
      purchasePrice: 80,
      sellingPrice:  120,
    },
  });
  if (stockCreated) console.log('  ✅ Sample Stock created  (Stand 1, Plain 5MM, Qty 10)');

  // --- sample price master entry ---
  const [, pmCreated] = await GlassPriceMaster.findOrCreate({
    where:    { shopId, glassType: 'Plain', thickness: 5 },
    defaults: {
      shopId,
      glassType:     'Plain',
      thickness:     5,
      purchasePrice: 80,
      sellingPrice:  120,
      isPending:     false,
    },
  });
  if (pmCreated) console.log('  ✅ Sample GlassPriceMaster entry created');
}

// ─── public API ───────────────────────────────────────────────────────────────

async function runSeeder() {
  console.log('🌱 Running seeder …');
  try {
    const shop = await seedShop();
    await seedAdmin(shop.id);
    await seedGlassTypes(shop.id);
    await seedStands(shop.id);

    const isDev      = process.env.NODE_ENV !== 'production';
    const forceSeed  = process.env.SEED_SAMPLE_DATA === 'true';
    if (isDev || forceSeed) {
      await seedSampleData(shop.id);
    }

    console.log('🌱 Seeder complete.\n');
  } catch (err) {
    // Non-fatal — a seeder failure should not prevent the server from starting
    console.error('❌ Seeder error (non-fatal):', err.message);
  }
}

module.exports = { runSeeder };
