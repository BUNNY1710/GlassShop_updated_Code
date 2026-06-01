package com.glassshop.ai.entity;


import java.time.LocalDateTime;

import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
		name = "stock",
		uniqueConstraints = {
				@UniqueConstraint(columnNames = {"glass_id", "stand_no", "shop_id", "height", "width"})
		}
	)
public class Stock {

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "glass_id", nullable = false)
    private Glass glass;

    @Column(name = "stand_no", nullable = false)
    private int standNo;
    
    @Column(name = "quantity", nullable = false)
    private int quantity;
    
    @Column(name = "min_quantity", nullable = false)
    private int minQuantity;
    
    @ManyToOne
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "height", length = 100)
    private String height;
    
    @Column(name = "width", length = 100)
    private String width;
    
    @Column(name = "hsn_no", length = 20)
    private String hsnNo;

	public String getHsnNo() {
		return hsnNo;
	}
	
	public void setHsnNo(String hsnNo) {
		this.hsnNo = hsnNo;
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
	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}
	public void setUpdatedAt(LocalDateTime updatedAt) {
		this.updatedAt = updatedAt;
	}
	public Shop getShop() {
		return shop;
	}
	public void setShop(Shop shop) {
		this.shop = shop;
	}
	public Long getId() {
		return id;
	}
	public void setId(Long id) {
		this.id = id;
	}
	public Glass getGlass() {
		return glass;
	}
	public void setGlass(Glass glass) {
		this.glass = glass;
	}
	
	
	public int getStandNo() {
		return standNo;
	}
	public void setStandNo(int standNo) {
		this.standNo = standNo;
	}
	public int getQuantity() {
		return quantity;
	}
	public void setQuantity(int quantity) {
		this.quantity = quantity;
	}
	public int getMinQuantity() {
		return minQuantity;
	}
	public void setMinQuantity(int minQuantity) {
		this.minQuantity = minQuantity;
	}
    
    
}
