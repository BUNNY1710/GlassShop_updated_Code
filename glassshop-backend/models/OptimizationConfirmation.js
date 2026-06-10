const { DataTypes } = require('sequelize');

// One row per confirmed cutting plan. planRef is a client-generated id for the
// optimization run; its uniqueness prevents the same plan being confirmed twice
// (no double inventory deduction).
module.exports = (sequelize) => {
  const OptimizationConfirmation = sequelize.define('OptimizationConfirmation', {
    id:              { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    shopId:          { type: DataTypes.BIGINT, allowNull: false, field: 'shop_id' },
    planRef:         { type: DataTypes.STRING(100), allowNull: false, unique: true, field: 'plan_ref' },
    username:        { type: DataTypes.STRING(255), allowNull: true },
    sheetsConsumed:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sheets_consumed' },
    remnantsCreated: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'remnants_created' },
    ordersIncluded:  { type: DataTypes.TEXT, allowNull: true, field: 'orders_included' },
    details:         { type: DataTypes.TEXT, allowNull: true },
    createdAt:       { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' }
  }, {
    tableName: 'optimization_confirmations',
    timestamps: false
  });

  return OptimizationConfirmation;
};
