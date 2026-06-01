const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    action: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    glassType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'glass_type'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    standNo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'stand_no'
    },
    height: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    width: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    unit: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    shopId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'shop_id',
      references: {
        model: 'shop',
        key: 'id'
      }
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW
    },
    fromStand: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'from_stand'
    },
    toStand: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'to_stand'
    }
    // Note: userId field removed as it doesn't exist in the database table
  }, {
    tableName: 'audit_log',
    timestamps: false,
    underscored: true
  });

  return AuditLog;
};
