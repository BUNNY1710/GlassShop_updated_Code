package com.glassshop.ai.dto;

public class ProfileResponse {

    private String username;
    private String role;
    private String shopName;

    public ProfileResponse(String username, String role, String shopName) {
        this.username = username;
        this.role = role;
        this.shopName = shopName;
    }

    public String getUsername() {
        return username;
    }

    public String getRole() {
        return role;
    }

    public String getShopName() {
        return shopName;
    }
}
