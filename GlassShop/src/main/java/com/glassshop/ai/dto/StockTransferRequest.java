package com.glassshop.ai.dto;

public class StockTransferRequest {

    private String glassType;
    private int thickness;        // ✅ ADD THIS
    private String height;
    private String width;
    private String unit;

    private Integer fromStand;
    private Integer toStand;
    private Integer quantity;

    /* ===== GETTERS & SETTERS ===== */

    public String getGlassType() {
        return glassType;
    }

    public void setGlassType(String glassType) {
        this.glassType = glassType;
    }

    public int getThickness() {           // ✅ REQUIRED
        return thickness;
    }

    public void setThickness(int thickness) {
        this.thickness = thickness;
    }

    public String getHeight() {
        return height;
    }

    public void setHeight(String height) {
        this.height = height;
    }

    public String getWidth() {
        return width;
    }

    public void setWidth(String width) {
        this.width = width;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public Integer getFromStand() {
        return fromStand;
    }

    public void setFromStand(Integer fromStand) {
        this.fromStand = fromStand;
    }

    public Integer getToStand() {
        return toStand;
    }

    public void setToStand(Integer toStand) {
        this.toStand = toStand;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
