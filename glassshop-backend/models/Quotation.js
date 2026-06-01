const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Quotation = sequelize.define('Quotation', {
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
    quotationNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'quotation_number'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    billingType: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'billing_type'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'DRAFT'
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
    quotationDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'quotation_date'
    },
    validUntil: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'valid_until'
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
    transportationRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'transportation_required'
    },
    shippingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'shipping_address'
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0
    },
    discountType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'AMOUNT',
      field: 'discount_type'
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
      field: 'discount_value'
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
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'confirmed_at'
    },
    confirmedBy: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'confirmed_by'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason'
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
    tableName: 'quotations',
    timestamps: true,
    underscored: true
  });

  return Quotation;
};
