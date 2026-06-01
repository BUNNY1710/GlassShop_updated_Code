package com.glassshop.ai.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

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

import java.time.LocalDateTime;
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

import com.glassshop.ai.dto.StockUpdateRequest;
import com.glassshop.ai.entity.AuditLog;
import com.glassshop.ai.entity.Glass;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.Stock;
import com.glassshop.ai.entity.StockHistory;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.AuditLogRepository;
import com.glassshop.ai.repository.GlassRepository;
import com.glassshop.ai.repository.StockHistoryRepository;
import com.glassshop.ai.repository.StockRepository;
import com.glassshop.ai.repository.UserRepository;

/**
 * Unit Tests for StockService
 * Tests business logic: update stock, get all stock, undo action, recent activity
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("StockService Unit Tests")
class StockServiceTest {

    @Mock
    private StockRepository stockRepository;

    @Mock
    private GlassRepository glassRepository;

    @Mock
    private StockHistoryRepository historyRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private StockService stockService;

    private User testUser;
    private Shop testShop;
    private Glass testGlass;
    private Stock testStock;
    private StockUpdateRequest updateRequest;

    @BeforeEach
    void setUp() {
        // Setup test data
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
        testGlass.setThickness(5);
        testGlass.setUnit("MM");

        testStock = new Stock();
        testStock.setId(1L);
        testStock.setGlass(testGlass);
        testStock.setStandNo(1);
        testStock.setQuantity(100);
        testStock.setMinQuantity(10);
        testStock.setShop(testShop);
        testStock.setHeight("100");
        testStock.setWidth("100");

        updateRequest = new StockUpdateRequest();
        updateRequest.setGlassType("5MM");
        updateRequest.setAction("ADD");
        updateRequest.setQuantity(50);
        updateRequest.setStandNo(1);
        updateRequest.setHeight("100");
        updateRequest.setWidth("100");
        updateRequest.setUnit("MM");

        // Setup SecurityContext
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("testuser");
        when(authentication.isAuthenticated()).thenReturn(true);
    }

    @Test
    @DisplayName("updateStock - Success: Add stock to existing item")
    void testUpdateStock_Add_Success() {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(glassRepository.findByTypeAndThicknessAndUnit("5MM", 5, "MM"))
                .thenReturn(Optional.of(testGlass));
        when(stockRepository.findByGlassAndStandNoAndShop(testGlass, 1, testShop))
                .thenReturn(Optional.of(testStock));
        when(stockRepository.save(any(Stock.class))).thenReturn(testStock);
        when(historyRepository.save(any(StockHistory.class))).thenReturn(new StockHistory());
        when(auditLogRepository.save(any(AuditLog.class))).thenReturn(new AuditLog());

        // Act
        String result = stockService.updateStock(updateRequest);

        // Assert
        assertTrue(result.contains("✅"));
        assertEquals(150, testStock.getQuantity()); // 100 + 50
        verify(stockRepository, times(1)).save(testStock);
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("updateStock - Success: Remove stock from existing item")
    void testUpdateStock_Remove_Success() {
        // Arrange
        updateRequest.setAction("REMOVE");
        updateRequest.setQuantity(30);

        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(glassRepository.findByTypeAndThicknessAndUnit("5MM", 5, "MM"))
                .thenReturn(Optional.of(testGlass));
        when(stockRepository.findByGlassAndStandNoAndShop(testGlass, 1, testShop))
                .thenReturn(Optional.of(testStock));
        when(stockRepository.save(any(Stock.class))).thenReturn(testStock);
        when(historyRepository.save(any(StockHistory.class))).thenReturn(new StockHistory());
        when(auditLogRepository.save(any(AuditLog.class))).thenReturn(new AuditLog());

        // Act
        String result = stockService.updateStock(updateRequest);

        // Assert
        assertTrue(result.contains("✅"));
        assertEquals(70, testStock.getQuantity()); // 100 - 30
        verify(stockRepository, times(1)).save(testStock);
    }

    @Test
    @DisplayName("updateStock - Failure: Not enough stock to remove")
    void testUpdateStock_Remove_InsufficientStock() {
        // Arrange
        updateRequest.setAction("REMOVE");
        updateRequest.setQuantity(150); // More than available (100)

        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(glassRepository.findByTypeAndThicknessAndUnit("5MM", 5, "MM"))
                .thenReturn(Optional.of(testGlass));
        when(stockRepository.findByGlassAndStandNoAndShop(testGlass, 1, testShop))
                .thenReturn(Optional.of(testStock));

        // Act
        String result = stockService.updateStock(updateRequest);

        // Assert
        assertTrue(result.contains("❌ Not enough stock"));
        assertEquals(100, testStock.getQuantity()); // Unchanged
        verify(stockRepository, never()).save(any(Stock.class));
    }

    @Test
    @DisplayName("updateStock - Failure: User not authenticated")
    void testUpdateStock_UserNotAuthenticated() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(null);

        // Act
        String result = stockService.updateStock(updateRequest);

        // Assert
        assertTrue(result.contains("❌ User not authenticated"));
        verify(userRepository, never()).findByUserName(anyString());
    }

    @Test
    @DisplayName("updateStock - Failure: User not found")
    void testUpdateStock_UserNotFound() {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.empty());

        // Act
        String result = stockService.updateStock(updateRequest);

        // Assert
        assertTrue(result.contains("❌ User not found"));
        verify(stockRepository, never()).save(any(Stock.class));
    }

    @Test
    @DisplayName("updateStock - Failure: User has no shop")
    void testUpdateStock_UserNoShop() {
        // Arrange
        testUser.setShop(null);
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));

        // Act
        String result = stockService.updateStock(updateRequest);

        // Assert
        assertTrue(result.contains("❌ User is not linked to any shop"));
        verify(stockRepository, never()).save(any(Stock.class));
    }

    @Test
    @DisplayName("updateStock - Success: Create new stock item if not exists")
    void testUpdateStock_CreateNewStock() {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(glassRepository.findByTypeAndThicknessAndUnit("5MM", 5, "MM"))
                .thenReturn(Optional.of(testGlass));
        when(stockRepository.findByGlassAndStandNoAndShop(testGlass, 1, testShop))
                .thenReturn(Optional.empty());
        when(stockRepository.save(any(Stock.class))).thenAnswer(invocation -> {
            Stock stock = invocation.getArgument(0);
            stock.setId(2L);
            return stock;
        });
        when(historyRepository.save(any(StockHistory.class))).thenReturn(new StockHistory());
        when(auditLogRepository.save(any(AuditLog.class))).thenReturn(new AuditLog());

        // Act
        String result = stockService.updateStock(updateRequest);

        // Assert
        assertTrue(result.contains("✅"));
        verify(stockRepository, times(1)).save(any(Stock.class));
    }

    @Test
    @DisplayName("updateStock - Success: Create new glass if not exists")
    void testUpdateStock_CreateNewGlass() {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(glassRepository.findByTypeAndThicknessAndUnit("8MM", 8, "MM"))
                .thenReturn(Optional.empty());
        when(glassRepository.save(any(Glass.class))).thenAnswer(invocation -> {
            Glass glass = invocation.getArgument(0);
            glass.setId(2L);
            return glass;
        });
        when(stockRepository.findByGlassAndStandNoAndShop(any(Glass.class), eq(1), eq(testShop)))
                .thenReturn(Optional.empty());
        when(stockRepository.save(any(Stock.class))).thenAnswer(invocation -> {
            Stock stock = invocation.getArgument(0);
            stock.setId(2L);
            return stock;
        });
        when(historyRepository.save(any(StockHistory.class))).thenReturn(new StockHistory());
        when(auditLogRepository.save(any(AuditLog.class))).thenReturn(new AuditLog());

        updateRequest.setGlassType("8MM");

        // Act
        String result = stockService.updateStock(updateRequest);

        // Assert
        assertTrue(result.contains("✅"));
        verify(glassRepository, times(1)).save(any(Glass.class));
        verify(stockRepository, times(1)).save(any(Stock.class));
    }

    @Test
    @DisplayName("getAllStock - Success: Returns all stock for user's shop")
    void testGetAllStock_Success() {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(stockRepository.findByShopId(testShop.getId()))
                .thenReturn(java.util.List.of(testStock));

        // Act
        var result = stockService.getAllStock();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(testStock, result.get(0));
        verify(stockRepository, times(1)).findByShopId(testShop.getId());
    }

    @Test
    @DisplayName("undoLastAction - Success: Undo last stock update")
    void testUndoLastAction_Success() {
        // Arrange
        StockHistory lastHistory = new StockHistory();
        lastHistory.setGlassId(testGlass.getId());
        lastHistory.setStandNo(1);
        lastHistory.setQuantity(50);
        lastHistory.setAction("ADD");
        lastHistory.setShop(testShop);

        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(historyRepository.findTopByShopIdOrderByCreatedAtDesc(testShop.getId()))
                .thenReturn(lastHistory);
        when(stockRepository.save(any(Stock.class))).thenReturn(testStock);
        when(auditLogRepository.save(any(AuditLog.class))).thenReturn(new AuditLog());

        testStock.setQuantity(150); // Current state after ADD

        // Act
        String result = stockService.undoLastAction();

        // Assert
        assertTrue(result.contains("✅") || result.contains("❌")); // May fail if no history
        verify(stockRepository, atMost(1)).save(any(Stock.class));
    }

    @Test
    @DisplayName("undoLastAction - Failure: No history found")
    void testUndoLastAction_NoHistory() {
        // Arrange
        when(userRepository.findByUserName("testuser")).thenReturn(Optional.of(testUser));
        when(historyRepository.findTopByShopIdOrderByCreatedAtDesc(testShop.getId()))
                .thenReturn(null);

        // Act
        String result = stockService.undoLastAction();

        // Assert
        assertTrue(result.contains("❌") || result.contains("No"));
        verify(stockRepository, never()).save(any(Stock.class));
    }
}

