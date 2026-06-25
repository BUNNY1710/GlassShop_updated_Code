const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Shop = sequelize.define('Shop', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    shopName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'shop_name'
    },
    ownerName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'owner_name'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    whatsappNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'whatsapp_number'
    },
    businessType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'business_type'
    },
    gstNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'gst_number'
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    pincode: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    lowStockThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      field: 'low_stock_threshold'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'shop',
    timestamps: true,
    updatedAt: false,
    underscored: true
  });

  return Shop;
};
