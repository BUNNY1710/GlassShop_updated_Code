package com.glassshop.ai.dto;

public class AuthResponse {
	private String tokan;
	private String role;
	public AuthResponse(String tokan, String role) {
		super();
		this.tokan = tokan;
		this.role = role;
	}
	public String getTokan() {
		return tokan;
	}
	public void setTokan(String tokan) {
		this.tokan = tokan;
	}
	public String getRole() {
		return role;
	}
	public void setRole(String role) {
		this.role = role;
	}
	
	
}
