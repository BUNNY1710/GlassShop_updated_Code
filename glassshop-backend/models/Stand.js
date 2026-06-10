const { DataTypes } = require('sequelize');

// Per-shop master list of physical stands (inventory locations). Stock may only
// be stored on a stand that exists here. Admin manages; staff selects.
module.exports = (sequelize) => {
  const Stand = sequelize.define('Stand', {
    id:          { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    shopId:      { type: DataTypes.BIGINT, allowNull: false, field: 'shop_id' },
    standNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'stand_number',
                   validate: { isInt: { msg: 'Stand number must be a whole number' }, min: { args: [1], msg: 'Stand number must be greater than 0' } } },
    standName:   { type: DataTypes.STRING(100), allowNull: true, field: 'stand_name' },
    description: { type: DataTypes.TEXT, allowNull: true },
    isActive:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }
  }, {
    tableName: 'stands',
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ['shop_id', 'stand_number'] }]
  });

  return Stand;
};
