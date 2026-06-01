package com.glassshop.ai.dto;

import java.time.LocalDate;
import java.util.List;

import com.glassshop.ai.enums.BillingType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public class CreateQuotationRequest {
    
    @NotNull(message = "Customer ID is required")
    private Long customerId;
    
    @NotNull(message = "Billing type is required")
    private BillingType billingType;
    
    @NotNull(message = "Quotation date is required")
    private LocalDate quotationDate;
    
    private LocalDate validUntil;
    
    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<QuotationItemDto> items;
    
    @PositiveOrZero(message = "Installation charge must be positive or zero")
    private Double installationCharge = 0.0;
    
    @PositiveOrZero(message = "Transport charge must be positive or zero")
    private Double transportCharge = 0.0;
    
    private Boolean transportationRequired = false;
    
    @PositiveOrZero(message = "Discount must be positive or zero")
    private Double discount = 0.0;
    
    // GST fields (required only when billingType = GST)
    @PositiveOrZero(message = "GST percentage must be positive or zero")
    private Double gstPercentage;
    
    private String customerState; // For inter-state vs intra-state calculation

    // Getters and Setters
    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public BillingType getBillingType() {
        return billingType;
    }

    public void setBillingType(BillingType billingType) {
        this.billingType = billingType;
    }

    public LocalDate getQuotationDate() {
        return quotationDate;
    }

    public void setQuotationDate(LocalDate quotationDate) {
        this.quotationDate = quotationDate;
    }

    public LocalDate getValidUntil() {
        return validUntil;
    }

    public void setValidUntil(LocalDate validUntil) {
        this.validUntil = validUntil;
    }

    public List<QuotationItemDto> getItems() {
        return items;
    }

    public void setItems(List<QuotationItemDto> items) {
        this.items = items;
    }

    public Double getInstallationCharge() {
        return installationCharge;
    }

    public void setInstallationCharge(Double installationCharge) {
        this.installationCharge = installationCharge;
    }

    public Double getTransportCharge() {
        return transportCharge;
    }

    public void setTransportCharge(Double transportCharge) {
        this.transportCharge = transportCharge;
    }

    public Boolean getTransportationRequired() {
        return transportationRequired;
    }

    public void setTransportationRequired(Boolean transportationRequired) {
        this.transportationRequired = transportationRequired;
    }

    public Double getDiscount() {
        return discount;
    }

    public void setDiscount(Double discount) {
        this.discount = discount;
    }

    public Double getGstPercentage() {
        return gstPercentage;
    }

    public void setGstPercentage(Double gstPercentage) {
        this.gstPercentage = gstPercentage;
    }

    public String getCustomerState() {
        return customerState;
    }

    public void setCustomerState(String customerState) {
        this.customerState = customerState;
    }
}

