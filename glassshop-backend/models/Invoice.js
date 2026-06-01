const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    shopId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'shop_id',
      references: {
        model: 'shop',
        key: 'id'
      }
    },
    customerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'customer_id',
      references: {
        model: 'customers',
        key: 'id'
      }
    },
    quotationId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'quotation_id',
      references: {
        model: 'quotations',
        key: 'id'
      }
    },
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'invoice_number'
    },
    invoiceType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'invoice_type'
    },
    billingType: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'billing_type'
    },
    invoiceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'invoice_date'
    },
    customerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'customer_name'
    },
    customerMobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'customer_mobile'
    },
    customerAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'customer_address'
    },
    customerGstin: {
      type: DataTypes.STRING(15),
      allowNull: true,
      field: 'customer_gstin'
    },
    customerState: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'customer_state'
    },
    shippingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'shipping_address'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    installationCharge: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
      field: 'installation_charge'
    },
    transportCharge: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
      field: 'transport_charge'
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0
    },
    gstPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'gst_percentage'
    },
    cgst: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    sgst: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    igst: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    gstAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
      field: 'gst_amount'
    },
    grandTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'grand_total'
    },
    paymentStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'DUE',
      field: 'payment_status'
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
      field: 'paid_amount'
    },
    dueAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'due_amount'
    },
    referenceArchitectId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'reference_architect_id',
      references: { model: 'architects', key: 'id' },
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
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'invoices',
    timestamps: true,
    underscored: true
  });

  return Invoice;
};
