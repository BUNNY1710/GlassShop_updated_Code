package com.glassshop.ai.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import com.glassshop.ai.entity.AuditLog;
import com.glassshop.ai.entity.Glass;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.Stock;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.AuditLogRepository;
import com.glassshop.ai.repository.StockRepository;
import com.glassshop.ai.repository.UserRepository;

/**
 * Unit Tests for AiStockAdvisorService
 * Tests AI stock advisor logic: reorder suggestions, best selling, dead stock, stand activity
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AiStockAdvisorService Unit Tests")
class AiStockAdvisorServiceTest {

    @Mock
    private StockRepository stockRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AiStockAdvisorService aiStockAdvisorService;

    private User testUser;
    private Shop testShop;
    private Stock testStock1;
    private Stock testStock2;
    private Glass testGlass;

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

        testGlass = new Glass();
        testGlass.setId(1L);
        testGlass.setType("5MM");

        testStock1 = new Stock();
        testStock1.setId(1L);
        testStock1.setGlass(testGlass);
        testStock1.setStandNo(1);
        testStock1.setQuantity(5);
        testStock1.setMinQuantity(20);
        testStock1.setShop(testShop);

        testStock2 = new Stock();
        testStock2.setId(2L);
        testStock2.setGlass(testGlass);
        testStock2.setStandNo(2);
        testStock2.setQuantity(3);
        testStock2.setMinQuantity(15);
        testStock2.setShop(testShop);

        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("testuser");
        when(authentication.isAuthenticated()).thenReturn(true);
    }

    @Test
    @DisplayName("getAdvice - Success: Reorder suggestion question")
    void testGetAdvice_ReorderSuggestion() {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(stockRepository.findLowStockByShopId(testShop.getId()))
                .thenReturn(Arrays.asList(testStock1, testStock2));

        // Act
        String result = aiStockAdvisorService.getAdvice("What should I reorder?");

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("REORDER SUGGESTIONS"));
        verify(stockRepository, times(1)).findLowStockByShopId(testShop.getId());
    }

    @Test
    @DisplayName("getAdvice - Success: Best selling question")
    void testGetAdvice_BestSelling() {
        // Arrange
        AuditLog auditLog = new AuditLog();
        auditLog.setAction("REMOVE");
        auditLog.setGlassType("5MM");
        auditLog.setQuantity(10);
        auditLog.setTimestamp(LocalDateTime.now().minusDays(10));
        auditLog.setShop(testShop);

        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(auditLogRepository.findByShopAndTimestampBetween(any(), any(), any()))
                .thenReturn(Arrays.asList(auditLog));

        // Act
        String result = aiStockAdvisorService.getAdvice("Which glass sells most?");

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("BEST SELLING GLASS"));
        verify(auditLogRepository, atLeastOnce()).findByShopAndTimestampBetween(any(), any(), any());
    }

    @Test
    @DisplayName("getAdvice - Success: Dead stock question")
    void testGetAdvice_DeadStock() {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(stockRepository.findByShopId(testShop.getId()))
                .thenReturn(Arrays.asList(testStock1));
        when(auditLogRepository.findByShopAndTimestampBetween(any(), any(), any()))
                .thenReturn(List.of());

        // Act
        String result = aiStockAdvisorService.getAdvice("Which glass is dead stock?");

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("DEAD STOCK") || result.contains("No dead stock"));
        verify(stockRepository, times(1)).findByShopId(testShop.getId());
    }

    @Test
    @DisplayName("getAdvice - Success: Stand activity question")
    void testGetAdvice_StandActivity() {
        // Arrange
        AuditLog auditLog1 = new AuditLog();
        auditLog1.setStandNo(1);
        auditLog1.setShop(testShop);

        AuditLog auditLog2 = new AuditLog();
        auditLog2.setStandNo(1);
        auditLog2.setShop(testShop);

        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(auditLogRepository.findByShop(testShop))
                .thenReturn(Arrays.asList(auditLog1, auditLog2));

        // Act
        String result = aiStockAdvisorService.getAdvice("Which stand has frequent movement?");

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("FREQUENTLY MOVED STANDS") || result.contains("Stand"));
        verify(auditLogRepository, times(1)).findByShop(testShop);
    }

    @Test
    @DisplayName("getAdvice - Success: Empty question returns default message")
    void testGetAdvice_EmptyQuestion() {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));

        // Act
        String result = aiStockAdvisorService.getAdvice("");

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("Please ask a question"));
    }

    @Test
    @DisplayName("getAdvice - Failure: User not found")
    void testGetAdvice_UserNotFound() {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.empty());

        // Act
        String result = aiStockAdvisorService.getAdvice("What should I reorder?");

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("❌") || result.contains("error"));
    }

    @Test
    @DisplayName("getAdvice - Success: No low stock items")
    void testGetAdvice_NoLowStock() {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(stockRepository.findLowStockByShopId(testShop.getId()))
                .thenReturn(List.of());

        // Act
        String result = aiStockAdvisorService.getAdvice("What should I reorder?");

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("Great news") || result.contains("No reordering"));
    }
}

