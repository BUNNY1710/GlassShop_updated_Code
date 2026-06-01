package com.glassshop.ai.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.glassshop.ai.dto.LoginRequest;
import com.glassshop.ai.dto.RegisterShopRequest;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.ShopRepository;
import com.glassshop.ai.repository.UserRepository;
import com.glassshop.ai.security.JwtUtil;

/**
 * Integration Tests for Authentication
 * Tests full authentication flow with database
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Authentication Integration Tests")
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private Shop testShop;
    private User testUser;

    @BeforeEach
    void setUp() {
        // Clean up
        userRepository.deleteAll();
        shopRepository.deleteAll();

        // Create test shop
        testShop = new Shop();
        testShop.setShopName("Test Shop");
        testShop.setEmail("test@shop.com");
        testShop = shopRepository.save(testShop);

        // Create test user
        testUser = new User();
        testUser.setUserName("testuser");
        testUser.setPassword(passwordEncoder.encode("password123"));
        testUser.setRole("ROLE_ADMIN");
        testUser.setShop(testShop);
        testUser = userRepository.save(testUser);
    }

    @Test
    @DisplayName("POST /auth/login - Integration: Successful login flow")
    void testLogin_Integration_Success() throws Exception {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("password123");

        // Act & Assert
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.role").value("ROLE_ADMIN"));
    }

    @Test
    @DisplayName("POST /auth/login - Integration: Invalid password")
    void testLogin_Integration_InvalidPassword() throws Exception {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("wrongpassword");

        // Act & Assert
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /auth/register-shop - Integration: Successful registration")
    void testRegisterShop_Integration_Success() throws Exception {
        // Arrange
        RegisterShopRequest request = new RegisterShopRequest();
        request.setShopName("New Shop");
        request.setEmail("newshop@test.com");
        request.setUsername("newadmin");
        request.setPassword("admin123");

        // Act & Assert
        mockMvc.perform(post("/auth/register-shop")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Shop registered successfully"));

        // Verify shop and user were created
        var shops = shopRepository.findAll();
        var users = userRepository.findAll();
        assertTrue(shops.stream().anyMatch(s -> s.getShopName().equals("New Shop")));
        assertTrue(users.stream().anyMatch(u -> u.getUserName().equals("newadmin")));
    }

    @Test
    @DisplayName("GET /auth/profile - Integration: Get profile with JWT token")
    void testGetProfile_Integration_WithToken() throws Exception {
        // Arrange
        String token = jwtUtil.generateToken("testuser", "ROLE_ADMIN");

        // Act & Assert
        mockMvc.perform(get("/auth/profile")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.role").value("ROLE_ADMIN"));
    }

    @Test
    @DisplayName("GET /auth/profile - Integration: Unauthorized without token")
    void testGetProfile_Integration_NoToken() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/auth/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/profile - Integration: Invalid token")
    void testGetProfile_Integration_InvalidToken() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/auth/profile")
                .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }
}

