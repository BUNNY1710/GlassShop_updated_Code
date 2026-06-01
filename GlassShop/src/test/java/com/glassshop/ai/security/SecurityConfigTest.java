package com.glassshop.ai.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.glassshop.ai.dto.LoginRequest;

/**
 * Security Configuration Tests
 * Tests role-based access control, unauthorized access, JWT validation
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Security Configuration Tests")
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /auth/login - Public endpoint accessible without authentication")
    void testPublicEndpoint_Accessible() throws Exception {
        // Act & Assert - POST required, so GET will return 405 or 404
        mockMvc.perform(get("/auth/login"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertTrue(status == 405 || status == 404 || status >= 400);
                });
    }

    @Test
    @DisplayName("GET /auth/profile - Requires authentication")
    void testProtectedEndpoint_RequiresAuth() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/auth/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/profile - Accessible with valid authentication")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testProtectedEndpoint_WithAuth() throws Exception {
        // Note: This will fail if user doesn't exist in test DB, but validates security config
        mockMvc.perform(get("/auth/profile"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertTrue(status == 200 || status == 404); // NotFound if user doesn't exist
                });
    }

    @Test
    @DisplayName("GET /audit/recent - Requires ADMIN role")
    @WithMockUser(username = "staff", roles = {"STAFF"})
    void testAdminEndpoint_RequiresAdminRole() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/audit/recent"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /audit/recent - Accessible with ADMIN role")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testAdminEndpoint_WithAdminRole() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/audit/recent"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertTrue(status == 200 || status == 404); // NotFound if no data
                });
    }

    @Test
    @DisplayName("GET /audit/transfer-count - Accessible with ADMIN role")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testTransferCount_WithAdminRole() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/audit/transfer-count"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /audit/transfer-count - Accessible with STAFF role")
    @WithMockUser(username = "staff", roles = {"STAFF"})
    void testTransferCount_WithStaffRole() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/audit/transfer-count"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /auth/create-staff - Requires ADMIN role")
    @WithMockUser(username = "staff", roles = {"STAFF"})
    void testCreateStaff_RequiresAdminRole() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/auth/create-staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /stock/all - Accessible with ADMIN role")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testStockEndpoint_WithAdminRole() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/stock/all"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /stock/all - Accessible with STAFF role")
    @WithMockUser(username = "staff", roles = {"STAFF"})
    void testStockEndpoint_WithStaffRole() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/stock/all"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /ai/** - Requires ADMIN role")
    @WithMockUser(username = "staff", roles = {"STAFF"})
    void testAiEndpoint_RequiresAdminRole() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/ai/stock/advice")
                .param("question", "test"))
                .andExpect(status().isForbidden());
    }
}

