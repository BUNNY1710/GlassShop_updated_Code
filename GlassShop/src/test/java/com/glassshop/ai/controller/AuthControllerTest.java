package com.glassshop.ai.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.glassshop.ai.dto.ChangePasswordRequest;
import com.glassshop.ai.dto.CreateStaffRequest;
import com.glassshop.ai.dto.LoginRequest;
import com.glassshop.ai.dto.RegisterShopRequest;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.ShopRepository;
import com.glassshop.ai.repository.UserRepository;
import com.glassshop.ai.security.JwtUtil;

/**
 * Unit Tests for AuthController
 * Tests authentication endpoints: login, register, profile, change password, staff management
 */
@WebMvcTest(AuthController.class)
@DisplayName("AuthController Unit Tests")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private ShopRepository shopRepository;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private User testUser;
    private Shop testShop;
    private String testToken;

    @BeforeEach
    void setUp() {
        // Setup test data
        testShop = new Shop();
        testShop.setId(1L);
        testShop.setShopName("Test Shop");
        testShop.setEmail("test@shop.com");

        testUser = new User();
        testUser.setId(1L);
        testUser.setUserName("testuser");
        testUser.setPassword("$2a$10$encodedPassword");
        testUser.setRole("ROLE_ADMIN");
        testUser.setShop(testShop);

        testToken = "test-jwt-token";
    }

    /* ===============================
       LOGIN TESTS
       =============================== */

    @Test
    @DisplayName("POST /auth/login - Success: Valid credentials")
    void testLogin_Success() throws Exception {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("password123");

        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", testUser.getPassword())).thenReturn(true);
        when(jwtUtil.generateToken("testuser", "ROLE_ADMIN")).thenReturn(testToken);

        // Act & Assert
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.role").value("ROLE_ADMIN"));

        verify(userRepository, times(1)).findByUserName("testuser");
        verify(passwordEncoder, times(1)).matches("password123", testUser.getPassword());
        verify(jwtUtil, times(1)).generateToken("testuser", "ROLE_ADMIN");
    }

    @Test
    @DisplayName("POST /auth/login - Failure: Invalid username")
    void testLogin_InvalidUsername() throws Exception {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setUsername("nonexistent");
        request.setPassword("password123");

        when(userRepository.findByUserName("nonexistent"))
                .thenReturn(Optional.empty());

        // Act & Assert
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().is5xxServerError());

        verify(userRepository, times(1)).findByUserName("nonexistent");
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    @DisplayName("POST /auth/login - Failure: Invalid password")
    void testLogin_InvalidPassword() throws Exception {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("wrongpassword");

        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongpassword", testUser.getPassword())).thenReturn(false);

        // Act & Assert
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$").value("Invalid username or password"));

        verify(userRepository, times(1)).findByUserName("testuser");
        verify(passwordEncoder, times(1)).matches("wrongpassword", testUser.getPassword());
        verify(jwtUtil, never()).generateToken(anyString(), anyString());
    }

    /* ===============================
       REGISTER SHOP TESTS
       =============================== */

    @Test
    @DisplayName("POST /auth/register-shop - Success: Valid registration")
    void testRegisterShop_Success() throws Exception {
        // Arrange
        RegisterShopRequest request = new RegisterShopRequest();
        request.setShopName("New Shop");
        request.setEmail("newshop@test.com");
        request.setUsername("admin");
        request.setPassword("admin123");

        when(shopRepository.save(any(Shop.class))).thenReturn(testShop);
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(passwordEncoder.encode("admin123")).thenReturn("$2a$10$encoded");

        // Act & Assert
        mockMvc.perform(post("/auth/register-shop")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Shop registered successfully"));

        verify(shopRepository, times(1)).save(any(Shop.class));
        verify(userRepository, times(1)).save(any(User.class));
        verify(passwordEncoder, times(1)).encode("admin123");
    }

    /* ===============================
       PROFILE TESTS
       =============================== */

    @Test
    @DisplayName("GET /auth/profile - Success: Authenticated user")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testGetProfile_Success() throws Exception {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));

        // Act & Assert
        mockMvc.perform(get("/auth/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.role").value("ROLE_ADMIN"))
                .andExpect(jsonPath("$.shopName").value("Test Shop"));

        verify(userRepository, times(1)).findByUserName("testuser");
    }

    @Test
    @DisplayName("GET /auth/profile - Failure: User not found")
    @WithMockUser(username = "nonexistent", roles = {"ADMIN"})
    void testGetProfile_UserNotFound() throws Exception {
        // Arrange
        when(userRepository.findByUserName("nonexistent")).thenReturn(Optional.empty());

        // Act & Assert
        mockMvc.perform(get("/auth/profile"))
                .andExpect(status().isNotFound());

        verify(userRepository, times(1)).findByUserName("nonexistent");
    }

    /* ===============================
       CHANGE PASSWORD TESTS
       =============================== */

    @Test
    @DisplayName("POST /auth/change-password - Success: Valid old password")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testChangePassword_Success() throws Exception {
        // Arrange
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setOldPassword("oldpass123");
        request.setNewPassword("newpass123");

        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("oldpass123", testUser.getPassword())).thenReturn(true);
        when(passwordEncoder.encode("newpass123")).thenReturn("$2a$10$newEncoded");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act & Assert
        mockMvc.perform(post("/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Password changed successfully"));

        verify(userRepository, times(1)).findByUserName("testuser");
        verify(passwordEncoder, times(1)).matches("oldpass123", testUser.getPassword());
        verify(passwordEncoder, times(1)).encode("newpass123");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("POST /auth/change-password - Failure: Incorrect old password")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testChangePassword_IncorrectOldPassword() throws Exception {
        // Arrange
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setOldPassword("wrongoldpass");
        request.setNewPassword("newpass123");

        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongoldpass", testUser.getPassword())).thenReturn(false);

        // Act & Assert
        mockMvc.perform(post("/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value("Old password is incorrect"));

        verify(userRepository, times(1)).findByUserName("testuser");
        verify(passwordEncoder, times(1)).matches("wrongoldpass", testUser.getPassword());
        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    /* ===============================
       CREATE STAFF TESTS
       =============================== */

    @Test
    @DisplayName("POST /auth/create-staff - Success: Valid staff creation")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testCreateStaff_Success() throws Exception {
        // Arrange
        CreateStaffRequest request = new CreateStaffRequest();
        request.setUsername("newstaff");
        request.setPassword("staff123");

        User admin = new User();
        admin.setUserName("admin");
        admin.setShop(testShop);

        when(userRepository.findByUserName("admin")).thenReturn(Optional.of(admin));
        when(userRepository.findByUserName("newstaff")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("staff123")).thenReturn("$2a$10$encoded");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act & Assert
        mockMvc.perform(post("/auth/create-staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Staff created successfully"));

        verify(userRepository, times(1)).findByUserName("admin");
        verify(userRepository, times(1)).findByUserName("newstaff");
        verify(passwordEncoder, times(1)).encode("staff123");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("POST /auth/create-staff - Failure: Username already exists")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testCreateStaff_UsernameExists() throws Exception {
        // Arrange
        CreateStaffRequest request = new CreateStaffRequest();
        request.setUsername("existinguser");
        request.setPassword("staff123");

        User admin = new User();
        admin.setUserName("admin");
        admin.setShop(testShop);

        User existingUser = new User();
        existingUser.setUserName("existinguser");

        when(userRepository.findByUserName("admin")).thenReturn(Optional.of(admin));
        when(userRepository.findByUserName("existinguser")).thenReturn(Optional.of(existingUser));

        // Act & Assert
        mockMvc.perform(post("/auth/create-staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value("Username already exists"));

        verify(userRepository, times(1)).findByUserName("admin");
        verify(userRepository, times(1)).findByUserName("existinguser");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("POST /auth/create-staff - Failure: Unauthorized (STAFF role)")
    @WithMockUser(username = "staff", roles = {"STAFF"})
    void testCreateStaff_Unauthorized() throws Exception {
        // Arrange
        CreateStaffRequest request = new CreateStaffRequest();
        request.setUsername("newstaff");
        request.setPassword("staff123");

        // Act & Assert
        mockMvc.perform(post("/auth/create-staff")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(userRepository, never()).findByUserName(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    /* ===============================
       GET STAFF TESTS
       =============================== */

    @Test
    @DisplayName("GET /auth/staff - Success: Returns staff list")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testGetStaff_Success() throws Exception {
        // Arrange
        User admin = new User();
        admin.setUserName("admin");
        admin.setShop(testShop);

        User staff1 = new User();
        staff1.setUserName("staff1");
        staff1.setRole("ROLE_STAFF");
        staff1.setShop(testShop);

        when(userRepository.findByUserName("admin")).thenReturn(Optional.of(admin));
        when(userRepository.findByShopIdAndRole(1L, "ROLE_STAFF"))
                .thenReturn(java.util.List.of(staff1));

        // Act & Assert
        mockMvc.perform(get("/auth/staff"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].userName").value("staff1"));

        verify(userRepository, times(1)).findByUserName("admin");
        verify(userRepository, times(1)).findByShopIdAndRole(1L, "ROLE_STAFF");
    }
}

