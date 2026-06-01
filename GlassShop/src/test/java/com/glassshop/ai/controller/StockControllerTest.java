package com.glassshop.ai.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Arrays;
import java.util.List;

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
import com.glassshop.ai.dto.StockUpdateRequest;
import com.glassshop.ai.entity.Stock;
import com.glassshop.ai.repository.StockRepository;
import com.glassshop.ai.repository.UserRepository;
import com.glassshop.ai.service.AlertService;
import com.glassshop.ai.service.ReorderService;
import com.glassshop.ai.service.StockService;
import com.glassshop.ai.service.AiExplanationService;

/**
 * Unit Tests for StockController
 * Tests stock management endpoints: update, get all, undo, recent activity
 */
@WebMvcTest(StockController.class)
@DisplayName("StockController Unit Tests")
class StockControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private StockService stockService;

    @MockBean
    private AlertService alertService;

    @MockBean
    private ReorderService reorderService;

    @MockBean
    private AiExplanationService aiExplanationService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private StockRepository stockRepository;

    private Stock testStock;

    @BeforeEach
    void setUp() {
        testStock = new Stock();
        testStock.setId(1L);
        testStock.setQuantity(100);
        testStock.setMinQuantity(10);
        testStock.setStandNo(1);
    }

    @Test
    @DisplayName("POST /stock/update - Success: Add stock")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testUpdateStock_Add_Success() throws Exception {
        // Arrange
        StockUpdateRequest request = new StockUpdateRequest();
        request.setGlassType("5MM");
        request.setAction("ADD");
        request.setQuantity(50);
        request.setStandNo(1);
        request.setHeight("100");
        request.setWidth("100");
        request.setUnit("MM");

        when(stockService.updateStock(any(StockUpdateRequest.class)))
                .thenReturn("✅ Stock updated successfully");

        // Act & Assert
        mockMvc.perform(post("/stock/update")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(stockService, times(1)).updateStock(any(StockUpdateRequest.class));
    }

    @Test
    @DisplayName("POST /stock/update - Success: Remove stock")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testUpdateStock_Remove_Success() throws Exception {
        // Arrange
        StockUpdateRequest request = new StockUpdateRequest();
        request.setGlassType("5MM");
        request.setAction("REMOVE");
        request.setQuantity(20);
        request.setStandNo(1);
        request.setHeight("100");
        request.setWidth("100");
        request.setUnit("MM");

        when(stockService.updateStock(any(StockUpdateRequest.class)))
                .thenReturn("✅ Stock updated successfully");

        // Act & Assert
        mockMvc.perform(post("/stock/update")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(stockService, times(1)).updateStock(any(StockUpdateRequest.class));
    }

    @Test
    @DisplayName("POST /stock/update - Failure: Invalid action")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testUpdateStock_InvalidAction() throws Exception {
        // Arrange
        StockUpdateRequest request = new StockUpdateRequest();
        request.setGlassType("5MM");
        request.setAction("INVALID");
        request.setQuantity(50);
        request.setStandNo(1);

        when(stockService.updateStock(any(StockUpdateRequest.class)))
                .thenReturn("❌ Invalid action");

        // Act & Assert
        mockMvc.perform(post("/stock/update")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(stockService, times(1)).updateStock(any(StockUpdateRequest.class));
    }

    @Test
    @DisplayName("GET /stock/all - Success: Returns all stock")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testGetAllStock_Success() throws Exception {
        // Arrange
        List<Stock> stockList = Arrays.asList(testStock);
        when(stockService.getAllStock()).thenReturn(stockList);

        // Act & Assert
        mockMvc.perform(get("/stock/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(1L));

        verify(stockService, times(1)).getAllStock();
    }

    @Test
    @DisplayName("GET /stock/all - Success: Empty list")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testGetAllStock_Empty() throws Exception {
        // Arrange
        when(stockService.getAllStock()).thenReturn(List.of());

        // Act & Assert
        mockMvc.perform(get("/stock/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());

        verify(stockService, times(1)).getAllStock();
    }

    @Test
    @DisplayName("POST /stock/undo - Success: Undo last action")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testUndoLastAction_Success() throws Exception {
        // Arrange
        when(stockService.undoLastAction())
                .thenReturn("✅ Last action undone successfully");

        // Act & Assert
        mockMvc.perform(post("/stock/undo"))
                .andExpect(status().isOk());

        verify(stockService, times(1)).undoLastAction();
    }

    @Test
    @DisplayName("GET /stock/recent - Success: Returns recent activity")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testGetRecentStockActivity_Success() throws Exception {
        // Arrange
        when(stockService.getRecentStockActivity(3))
                .thenReturn(List.of());

        // Act & Assert
        mockMvc.perform(get("/stock/recent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        verify(stockService, times(1)).getRecentStockActivity(3);
    }

    @Test
    @DisplayName("GET /stock/ai/explain - Success: Returns AI explanation")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testAiExplanation_Success() throws Exception {
        // Arrange
        when(aiExplanationService.explainLowStock())
                .thenReturn("AI explanation of low stock");

        // Act & Assert
        mockMvc.perform(get("/stock/ai/explain"))
                .andExpect(status().isOk())
                .andExpect(content().string("AI explanation of low stock"));

        verify(aiExplanationService, times(1)).explainLowStock();
    }

    @Test
    @DisplayName("GET /stock/reorder/suggest - Success: Returns reorder suggestions")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testReorderSuggestion_Success() throws Exception {
        // Arrange
        when(reorderService.getReorderSuggestions())
                .thenReturn("Reorder suggestions");

        // Act & Assert
        mockMvc.perform(get("/stock/reorder/suggest"))
                .andExpect(status().isOk())
                .andExpect(content().string("Reorder suggestions"));

        verify(reorderService, times(1)).getReorderSuggestions();
    }

    @Test
    @DisplayName("GET /stock/alert/low - Success: Returns low stock alert")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testLowStockAlert_Success() throws Exception {
        // Arrange
        when(alertService.checkLowStockOnly())
                .thenReturn("Low stock alert");

        // Act & Assert
        mockMvc.perform(get("/stock/alert/low"))
                .andExpect(status().isOk())
                .andExpect(content().string("Low stock alert"));

        verify(alertService, times(1)).checkLowStockOnly();
    }
}

