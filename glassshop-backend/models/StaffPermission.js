const { DataTypes } = require('sequelize');

// One row per (staff user, permission). Admin users get no rows — they
// implicitly hold every permission. Deleting a user cascades these rows.
module.exports = (sequelize) => {
  const StaffPermission = sequelize.define('StaffPermission', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'user_id'
    },
    permissionKey: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'permission_key'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'staff_permissions',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['user_id', 'permission_key'] }
    ]
  });

  return StaffPermission;
};
