const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Installation = sequelize.define('Installation', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    invoiceId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'invoice_id',
      references: {
        model: 'invoices',
        key: 'id'
      }
    },
    siteId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'site_id',
      references: {
        model: 'sites',
        key: 'id'
      }
    }
  }, {
    tableName: 'installations',
    timestamps: false,
    underscored: true
  });

  return Installation;
};
