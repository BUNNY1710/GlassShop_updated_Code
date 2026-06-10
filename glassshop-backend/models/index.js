const sequelize = require('../config/database');

// Import models
const Architect = require('./Architect')(sequelize);
const Shop = require('./Shop')(sequelize);
const User = require('./User')(sequelize);
const Glass = require('./Glass')(sequelize);
const Stock = require('./Stock')(sequelize);
const StockHistory = require('./StockHistory')(sequelize);
const Customer = require('./Customer')(sequelize);
const Quotation = require('./Quotation')(sequelize);
const QuotationItem = require('./QuotationItem')(sequelize);
const Invoice = require('./Invoice')(sequelize);
const InvoiceItem = require('./InvoiceItem')(sequelize);
const Payment = require('./Payment')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);
const Installation = require('./Installation')(sequelize);
const Site = require('./Site')(sequelize);
const GlassPriceMaster = require('./GlassPriceMaster')(sequelize);
const GlassType = require('./GlassType')(sequelize);
const StaffPermission = require('./StaffPermission')(sequelize);
const OptimizationConfirmation = require('./OptimizationConfirmation')(sequelize);
const InventoryMovement = require('./InventoryMovement')(sequelize);

// Define associations
// Shop associations
Shop.hasMany(Architect, { foreignKey: 'shopId', as: 'architects' });
Shop.hasMany(User, { foreignKey: 'shopId', as: 'users' });
Shop.hasMany(Stock, { foreignKey: 'shopId', as: 'stocks' });
Shop.hasMany(Customer, { foreignKey: 'shopId', as: 'customers' });
Shop.hasMany(GlassType, { foreignKey: 'shopId', as: 'glassTypes' });
GlassType.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
Shop.hasMany(Quotation, { foreignKey: 'shopId', as: 'quotations' });
Shop.hasMany(Invoice, { foreignKey: 'shopId', as: 'invoices' });

// User associations
User.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
User.hasMany(StaffPermission, { foreignKey: 'userId', as: 'permissions', onDelete: 'CASCADE' });
StaffPermission.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Stock associations
Stock.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
Stock.belongsTo(Glass, { foreignKey: 'glassId', as: 'glass' });
// Note: StockHistory doesn't have stockId foreign key - relationship is through glass_id, shop_id, stand_no

// StockHistory associations
// Note: StockHistory doesn't have stockId - it has glassId, shopId, standNo instead

// Glass associations
Glass.hasMany(Stock, { foreignKey: 'glassId', as: 'stocks' });

// Architect associations
Architect.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
Architect.hasMany(Customer,   { foreignKey: 'referenceArchitectId', as: 'referredCustomers' });
Architect.hasMany(Quotation,  { foreignKey: 'referenceArchitectId', as: 'referredQuotations' });
Architect.hasMany(Invoice,    { foreignKey: 'referenceArchitectId', as: 'referredOrders' });

// Customer associations
Customer.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
Customer.belongsTo(Architect, { foreignKey: 'referenceArchitectId', as: 'referenceArchitect' });
Customer.hasMany(Quotation, { foreignKey: 'customerId', as: 'quotations' });
Customer.hasMany(Invoice, { foreignKey: 'customerId', as: 'invoices' });

// Quotation associations
Quotation.belongsTo(Shop,      { foreignKey: 'shopId',               as: 'shop' });
Quotation.belongsTo(Customer,  { foreignKey: 'customerId',           as: 'customer' });
Quotation.belongsTo(Architect, { foreignKey: 'referenceArchitectId', as: 'referenceArchitect' });
Quotation.hasMany(QuotationItem, { foreignKey: 'quotationId', as: 'items' });
Quotation.hasOne(Invoice, { foreignKey: 'quotationId', as: 'invoice' });

// QuotationItem associations
QuotationItem.belongsTo(Quotation, { foreignKey: 'quotationId', as: 'quotation' });

// Invoice associations
Invoice.belongsTo(Shop,      { foreignKey: 'shopId',               as: 'shop' });
Invoice.belongsTo(Customer,  { foreignKey: 'customerId',           as: 'customer' });
Invoice.belongsTo(Quotation, { foreignKey: 'quotationId',          as: 'quotation' });
Invoice.belongsTo(Architect, { foreignKey: 'referenceArchitectId', as: 'referenceArchitect' });
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items' });
Invoice.hasMany(Payment, { foreignKey: 'invoiceId', as: 'payments' });

// InvoiceItem associations
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// Payment associations
Payment.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// AuditLog associations
// Note: User association removed as userId column doesn't exist in audit_log table

// Installation associations
Installation.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
Installation.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });

// Site associations
Site.hasMany(Installation, { foreignKey: 'siteId', as: 'installations' });

module.exports = {
  sequelize,
  Architect,
  Shop,
  User,
  Glass,
  Stock,
  StockHistory,
  Customer,
  Quotation,
  QuotationItem,
  Invoice,
  InvoiceItem,
  Payment,
  AuditLog,
  Installation,
  Site,
  GlassPriceMaster,
  GlassType,
  StaffPermission,
  OptimizationConfirmation,
  InventoryMovement
};
