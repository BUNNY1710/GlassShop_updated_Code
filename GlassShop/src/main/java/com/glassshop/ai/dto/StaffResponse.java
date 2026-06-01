package com.glassshop.ai.dto;

public class StaffResponse {

    private Long id;
    private String username;

    public StaffResponse(Long id, String username) {
        this.id = id;
        this.username = username;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }
}
