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
@Table(name = "stock_history")
public class StockHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "glass_id", nullable = false)
    private Long glassId;
    
    @Column(name = "stand_no", nullable = false)
    private int standNo;
    
    @Column(name = "quantity", nullable = false)
    private int quantity;
    
    @Column(name = "action", nullable = false, length = 20)
    private String action; // ADD or REMOVE
    
    @ManyToOne
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /* GETTERS & SETTERS */
    public Long getId() { return id; }

    public Long getGlassId() { return glassId; }
    public void setGlassId(Long glassId) { this.glassId = glassId; }

    public int getStandNo() { return standNo; }
    public void setStandNo(int standNo) { this.standNo = standNo; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    
    

    public Shop getShop() {
		return shop;
	}

	public void setShop(Shop shop) {
		this.shop = shop;
	}

    public LocalDateTime getCreatedAt() { 
        return createdAt; 
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
