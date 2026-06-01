const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Site = sequelize.define('Site', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    customerId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'customer_id',
      references: {
        model: 'customers',
        key: 'id'
      }
    }
  }, {
    tableName: 'sites',
    timestamps: false,
    underscored: true
  });

  return Site;
};
