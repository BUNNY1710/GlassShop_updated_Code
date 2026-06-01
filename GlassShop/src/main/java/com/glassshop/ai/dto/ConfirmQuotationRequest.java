package com.glassshop.ai.dto;

import com.glassshop.ai.enums.QuotationStatus;

public class ConfirmQuotationRequest {
    private QuotationStatus action; // CONFIRMED or REJECTED
    private String rejectionReason; // Required if action is REJECTED

    // Getters and Setters
    public QuotationStatus getAction() {
        return action;
    }

    public void setAction(QuotationStatus action) {
        this.action = action;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }
}

