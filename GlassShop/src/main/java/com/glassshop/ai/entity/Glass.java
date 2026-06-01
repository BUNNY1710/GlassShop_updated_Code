package com.glassshop.ai.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "glass")
public class Glass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "type", nullable = false, length = 50)
    private String type;          // 5MM, 8MM, 10MM
    
    @Column(name = "thickness", nullable = false)
    private int thickness;

    @Column(name = "unit", nullable = false, length = 10)
    private String unit;          // MM / INCH / FEET

    /* ===== GETTERS & SETTERS ===== */

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public int getThickness() {
        return thickness;
    }

    public void setThickness(int thickness) {
        this.thickness = thickness;
    }

//    public String getHeight() {
//        return height;
//    }
//
//    public void setHeight(String height) {
//        this.height = height;
//    }
//
//    public String getWidth() {
//        return width;
//    }
//
//    public void setWidth(String width) {
//        this.width = width;
//    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }
}
