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
    // Optional fields - may not exist in database yet
    // These are commented out until columns are added to database
    // gstNumber: {
    //   type: DataTypes.STRING(50),
    //   allowNull: true,
    //   field: 'gst_number'
    // },
    // address: {
    //   type: DataTypes.TEXT,
    //   allowNull: true
    // },
    // phone: {
    //   type: DataTypes.STRING(50),
    //   allowNull: true
    // },
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
