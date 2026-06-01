package com.glassshop.ai.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username")
    private String username;
    
    @Column(name = "role", nullable = false, length = 50)
    private String role;

    @Column(name = "action", length = 20)
    private String action;        // ADD / REMOVE / TRANSFER
    
    @Column(name = "glass_type", length = 50)
    private String glassType;

    @Column(name = "quantity", nullable = false)
    private int quantity;
    
    @Column(name = "stand_no")
    private int standNo;

    @Column(name = "height", length = 100)
    private String height;
    
    @Column(name = "width", length = 100)
    private String width;
    
    @Column(name = "unit", length = 10)
    private String unit;
    
    @Column(name = "price")
    private Double price;
    
    @ManyToOne
    @JoinColumn(name = "shop_id")
    private Shop shop;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;
    
    @Column(name = "from_stand")
    private Integer fromStand;

    @Column(name = "to_stand")
    private Integer toStand;



    /* ================= GETTERS & SETTERS ================= */

    
    
    public Long getId() {
        return id;
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

	public Shop getShop() {
		return shop;
	}

	public void setShop(Shop shop) {
		this.shop = shop;
	}

	public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getGlassType() {
        return glassType;
    }

    public void setGlassType(String glassType) {
        this.glassType = glassType;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public int getStandNo() {
        return standNo;
    }

    public void setStandNo(int standNo) {
        this.standNo = standNo;
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

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }
}
