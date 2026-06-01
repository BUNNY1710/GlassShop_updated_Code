const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InvoiceItem = sequelize.define('InvoiceItem', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    invoiceId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'invoice_id',
      references: {
        model: 'invoices',
        key: 'id'
      }
    },
    glassType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'glass_type'
    },
    thickness: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    height: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    width: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    ratePerSqft: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'rate_per_sqft'
    },
    area: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    hsnCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'hsn_code'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    itemOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'item_order'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'invoice_items',
    timestamps: false,
    underscored: true
  });

  return InvoiceItem;
};
