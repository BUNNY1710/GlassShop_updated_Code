const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    invoiceId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'invoice_id',
      references: {
        model: 'invoices',
        key: 'id'
      }
    },
    paymentMode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'payment_mode'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'payment_date'
    },
    referenceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'reference_number'
    },
    bankName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'bank_name'
    },
    chequeNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'cheque_number'
    },
    transactionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'transaction_id'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'created_by'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'payments',
    timestamps: false,
    underscored: true
  });

  return Payment;
};
