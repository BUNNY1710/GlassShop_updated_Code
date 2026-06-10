const { DataTypes } = require('sequelize');

// Per-shop master list of glass types. Drives every glass-type dropdown so
// nothing is hardcoded. The string itself is still denormalised onto Glass,
// QuotationItem, InvoiceItem, etc.; rename/delete cascade those values.
module.exports = (sequelize) => {
  const GlassType = sequelize.define('GlassType', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Glass type name cannot be empty' }
      }
    },
    shopId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'shop_id'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'glass_types',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['shop_id', 'name'] }
    ]
  });

  return GlassType;
};
