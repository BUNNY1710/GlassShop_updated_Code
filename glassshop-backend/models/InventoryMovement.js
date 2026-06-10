const { DataTypes } = require('sequelize');

// Audit trail of every stock change made by a plan confirmation. movementType
// 'OUT' = sheets consumed, 'IN' = remnant returned to inventory.
module.exports = (sequelize) => {
  const InventoryMovement = sequelize.define('InventoryMovement', {
    id:           { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    shopId:       { type: DataTypes.BIGINT, allowNull: false, field: 'shop_id' },
    stockId:      { type: DataTypes.BIGINT, allowNull: true, field: 'stock_id' },
    glassType:    { type: DataTypes.STRING(100), allowNull: true, field: 'glass_type' },
    thickness:    { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    standNo:      { type: DataTypes.INTEGER, allowNull: true, field: 'stand_no' },
    quantity:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    movementType: { type: DataTypes.STRING(10), allowNull: false, field: 'movement_type' },
    reason:       { type: DataTypes.STRING(255), allowNull: true },
    refId:        { type: DataTypes.BIGINT, allowNull: true, field: 'ref_id' },
    username:     { type: DataTypes.STRING(255), allowNull: true },
    createdAt:    { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' }
  }, {
    tableName: 'inventory_movements',
    timestamps: false
  });

  return InventoryMovement;
};
