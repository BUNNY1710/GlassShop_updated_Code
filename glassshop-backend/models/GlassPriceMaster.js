const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GlassPriceMaster = sequelize.define('GlassPriceMaster', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
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
    glassType: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'glass_type'
    },
    thickness: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
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
    isPending: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_pending'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'glass_price_master',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['shop_id', 'glass_type', 'thickness']
      }
    ]
  });

  return GlassPriceMaster;
};

