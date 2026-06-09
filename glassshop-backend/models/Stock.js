const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Stock = sequelize.define('Stock', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    glassId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'glass_id',
      references: {
        model: 'glass',
        key: 'id'
      }
    },
    standNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'stand_no',
      validate: {
        isInt: { msg: 'Stand number must be a whole number' },
        min: { args: [1], msg: 'Stand number must be greater than 0' }
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      // On-hand count may be 0 (out of stock) but never negative. The "≥ 1"
      // rule applies to the entered add/remove amount (validated in the route),
      // not to this stored balance.
      validate: {
        isInt: { msg: 'Quantity must be a whole number' },
        min: { args: [0], msg: 'Quantity cannot be negative' }
      }
    },
    minQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'min_quantity',
      defaultValue: 0
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
    height: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    width: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    hsnNo: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'hsn_no'
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'purchase_price'
    },
    sellingPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'selling_price'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'APPROVED'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'stock',
    timestamps: true,
    createdAt: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['glass_id', 'stand_no', 'shop_id', 'height', 'width']
      }
    ]
  });

  return Stock;
};
