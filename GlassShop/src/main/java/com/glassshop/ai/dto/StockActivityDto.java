package com.glassshop.ai.dto;

import java.time.LocalDateTime;

public class StockActivityDto {

    private String username;
    private String action;
    private String glassType;
    private int quantity;
    private int standNo;
    private LocalDateTime timestamp;
    

    // ✅ Constructor
   

    // ✅ Getters
    public String getUsername() {
        return username;
    }

    public StockActivityDto() {
		super();
		// TODO Auto-generated constructor stub
	}

	

	public StockActivityDto(String username, String action, String glassType, int quantity, int standNo,
			LocalDateTime timestamp) {
		super();
		this.username = username;
		this.action = action;
		this.glassType = glassType;
		this.quantity = quantity;
		this.standNo = standNo;
		this.timestamp = timestamp;
	}

	public String getAction() {
        return action;
    }

    public int getQuantity() {
        return quantity;
    }

    public String getGlassType() {
        return glassType;
    }

    public int getStandNo() {
        return standNo;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }
}
