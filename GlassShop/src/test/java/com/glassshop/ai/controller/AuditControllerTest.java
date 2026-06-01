package com.glassshop.ai.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.glassshop.ai.entity.AuditLog;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.AuditLogRepository;
import com.glassshop.ai.repository.UserRepository;

/**
 * Unit Tests for AuditController
 * Tests audit log endpoints: recent logs, transfer count
 */
@WebMvcTest(AuditController.class)
@DisplayName("AuditController Unit Tests")
class AuditControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuditLogRepository auditLogRepository;

    @MockBean
    private UserRepository userRepository;

    private User testUser;
    private Shop testShop;
    private AuditLog testAuditLog;

    @BeforeEach
    void setUp() {
        testShop = new Shop();
        testShop.setId(1L);
        testShop.setShopName("Test Shop");

        testUser = new User();
        testUser.setId(1L);
        testUser.setUserName("testuser");
        testUser.setRole("ROLE_ADMIN");
        testUser.setShop(testShop);

        testAuditLog = new AuditLog();
        testAuditLog.setId(1L);
        testAuditLog.setUsername("testuser");
        testAuditLog.setAction("ADD");
        testAuditLog.setGlassType("5MM");
        testAuditLog.setQuantity(10);
        testAuditLog.setStandNo(1);
        testAuditLog.setTimestamp(LocalDateTime.now());
        testAuditLog.setShop(testShop);
    }

    @Test
    @DisplayName("GET /audit/recent - Success: Returns recent audit logs (ADMIN only)")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testGetRecentLogs_Success() throws Exception {
        // Arrange
        List<AuditLog> auditLogs = Arrays.asList(testAuditLog);
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(auditLogRepository.findByShopOrderByTimestampDesc(testShop))
                .thenReturn(auditLogs);

        // Act & Assert
        mockMvc.perform(get("/audit/recent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].username").value("testuser"))
                .andExpect(jsonPath("$[0].action").value("ADD"));

        verify(userRepository, times(1)).findByUserName("testuser");
        verify(auditLogRepository, times(1)).findByShopOrderByTimestampDesc(testShop);
    }

    @Test
    @DisplayName("GET /audit/recent - Failure: Unauthorized (STAFF role)")
    @WithMockUser(username = "staff", roles = {"STAFF"})
    void testGetRecentLogs_Unauthorized() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/audit/recent"))
                .andExpect(status().isForbidden());

        verify(auditLogRepository, never()).findByShopOrderByTimestampDesc(any());
    }

    @Test
    @DisplayName("GET /audit/recent - Success: Empty list when no logs")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testGetRecentLogs_Empty() throws Exception {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(auditLogRepository.findByShopOrderByTimestampDesc(testShop))
                .thenReturn(List.of());

        // Act & Assert
        mockMvc.perform(get("/audit/recent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());

        verify(userRepository, times(1)).findByUserName("testuser");
        verify(auditLogRepository, times(1)).findByShopOrderByTimestampDesc(testShop);
    }

    @Test
    @DisplayName("GET /audit/transfer-count - Success: Returns transfer count (ADMIN)")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testGetTransferCount_Success_Admin() throws Exception {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(auditLogRepository.countTransfersByShop(testShop)).thenReturn(5L);

        // Act & Assert
        mockMvc.perform(get("/audit/transfer-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(5L));

        verify(userRepository, times(1)).findByUserName("testuser");
        verify(auditLogRepository, times(1)).countTransfersByShop(testShop);
    }

    @Test
    @DisplayName("GET /audit/transfer-count - Success: Returns transfer count (STAFF)")
    @WithMockUser(username = "staff", roles = {"STAFF"})
    void testGetTransferCount_Success_Staff() throws Exception {
        // Arrange
        User staff = new User();
        staff.setUserName("staff");
        staff.setShop(testShop);

        when(userRepository.findByUserName("staff")).thenReturn(Optional.of(staff));
        when(auditLogRepository.countTransfersByShop(testShop)).thenReturn(3L);

        // Act & Assert
        mockMvc.perform(get("/audit/transfer-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(3L));

        verify(userRepository, times(1)).findByUserName("staff");
        verify(auditLogRepository, times(1)).countTransfersByShop(testShop);
    }

    @Test
    @DisplayName("GET /audit/transfer-count - Success: Returns 0 when no transfers")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testGetTransferCount_Zero() throws Exception {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(auditLogRepository.countTransfersByShop(testShop)).thenReturn(0L);

        // Act & Assert
        mockMvc.perform(get("/audit/transfer-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(0L));

        verify(userRepository, times(1)).findByUserName("testuser");
        verify(auditLogRepository, times(1)).countTransfersByShop(testShop);
    }

    @Test
    @DisplayName("GET /audit/transfer-count - Failure: User not found")
    @WithMockUser(username = "nonexistent", roles = {"ADMIN"})
    void testGetTransferCount_UserNotFound() throws Exception {
        // Arrange
        when(userRepository.findByUserName("nonexistent")).thenReturn(Optional.empty());

        // Act & Assert
        mockMvc.perform(get("/audit/transfer-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(0L));

        verify(userRepository, times(1)).findByUserName("nonexistent");
        verify(auditLogRepository, never()).countTransfersByShop(any());
    }

    @Test
    @DisplayName("GET /audit/transfer-count - Failure: User has no shop")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testGetTransferCount_NoShop() throws Exception {
        // Arrange
        User userNoShop = new User();
        userNoShop.setUserName("testuser");
        userNoShop.setShop(null);

        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(userNoShop));

        // Act & Assert
        mockMvc.perform(get("/audit/transfer-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(0L));

        verify(userRepository, times(1)).findByUserName("testuser");
        verify(auditLogRepository, never()).countTransfersByShop(any());
    }
}

