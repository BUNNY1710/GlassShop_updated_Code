package com.glassshop.ai.dto;

import java.time.LocalDate;

import com.glassshop.ai.enums.InvoiceType;

import jakarta.validation.constraints.NotNull;

public class CreateInvoiceRequest {
    
    @NotNull(message = "Quotation ID is required")
    private Long quotationId;
    
    @NotNull(message = "Invoice type is required")
    private InvoiceType invoiceType;
    
    private LocalDate invoiceDate;

    // Getters and Setters
    public Long getQuotationId() {
        return quotationId;
    }

    public void setQuotationId(Long quotationId) {
        this.quotationId = quotationId;
    }

    public InvoiceType getInvoiceType() {
        return invoiceType;
    }

    public void setInvoiceType(InvoiceType invoiceType) {
        this.invoiceType = invoiceType;
    }

    public LocalDate getInvoiceDate() {
        return invoiceDate;
    }

    public void setInvoiceDate(LocalDate invoiceDate) {
        this.invoiceDate = invoiceDate;
    }
}

