const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    userName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'user_name'
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    whatsappNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'whatsapp_number'
    },
    shopId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'shop_id',
      references: {
        model: 'shop',
        key: 'id'
      }
    }
  }, {
    tableName: 'users',
    timestamps: false,
    underscored: true
  });

  return User;
};
