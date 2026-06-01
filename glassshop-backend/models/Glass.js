const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Glass = sequelize.define('Glass', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    thickness: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING(10),
      allowNull: false
    }
  }, {
    tableName: 'glass',
    timestamps: false,
    underscored: true
  });

  return Glass;
};
