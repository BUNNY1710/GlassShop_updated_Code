const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockHistory = sequelize.define('StockHistory', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    // Note: stock_id field removed - it doesn't exist in the database table
    glassId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'glass_id'
    },
    standNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'stand_no'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    action: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    shopId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'shop_id',
      references: {
        model: 'shop',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'stock_history',
    timestamps: false,
    underscored: true
  });

  return StockHistory;
};
