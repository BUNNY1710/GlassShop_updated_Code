package com.glassshop.ai.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.glassshop.ai.dto.AiRequest;
import com.glassshop.ai.security.JwtFilter;
import com.glassshop.ai.security.JwtUtil;
import com.glassshop.ai.service.AiService;
import com.glassshop.ai.service.AiStockAdvisorService;
import com.glassshop.ai.service.InstallationService;
import com.glassshop.ai.service.PredictionService;
import com.glassshop.ai.service.StockService;

/**
 * Unit Tests for AiController
 * Tests AI endpoints: ping, stock advice, ask
 */
@WebMvcTest(controllers = AiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AiController Unit Tests")
class AiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private StockService stockService;

    @MockBean
    private InstallationService installationService;

    @MockBean
    private AiService aiService;

    @MockBean
    private PredictionService predictionService;

    @MockBean
    private AiStockAdvisorService aiStockAdvisorService;

    @MockBean
    private JwtFilter jwtFilter;

    @MockBean
    private JwtUtil jwtUtil;

    @Test
    @DisplayName("GET /ai/ping - Success: Returns health check")
    void testPing_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/ai/ping"))
                .andExpect(status().isOk())
                .andExpect(content().string("Spring Boot is working 👍"));
    }

    @Test
    @DisplayName("GET /ai/stock/advice - Success: Returns stock advice")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testGetStockAdvice_Success() throws Exception {
        // Arrange
        String question = "What should I reorder?";
        String expectedResponse = "📋 REORDER SUGGESTIONS (Top 5 Priority Items):\n\n1. 5MM (Stand #1)";

        when(aiStockAdvisorService.getAdvice(question)).thenReturn(expectedResponse);

        // Act & Assert
        mockMvc.perform(get("/ai/stock/advice")
                .param("question", question))
                .andExpect(status().isOk())
                .andExpect(content().string(expectedResponse));

        verify(aiStockAdvisorService, times(1)).getAdvice(question);
    }

    @Test
    @DisplayName("GET /ai/stock/advice - Success: Empty question")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testGetStockAdvice_EmptyQuestion() throws Exception {
        // Arrange
        String question = "";
        String expectedResponse = "Please ask a question about your stock. For example: 'What should I reorder?'";

        when(aiStockAdvisorService.getAdvice(question)).thenReturn(expectedResponse);

        // Act & Assert
        mockMvc.perform(get("/ai/stock/advice")
                .param("question", question))
                .andExpect(status().isOk())
                .andExpect(content().string(expectedResponse));

        verify(aiStockAdvisorService, times(1)).getAdvice(question);
    }

    @Test
    @DisplayName("POST /ai/ask - Success: LOW_STOCK action")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testAsk_LowStock() throws Exception {
        // Arrange
        AiRequest request = new AiRequest();
        request.setAction("LOW_STOCK");

        String expectedResponse = "Low stock data";
        when(stockService.getLowStockData()).thenReturn(expectedResponse);

        // Act & Assert
        mockMvc.perform(post("/ai/ask")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string(expectedResponse));

        verify(stockService, times(1)).getLowStockData();
    }

    @Test
    @DisplayName("POST /ai/ask - Success: AVAILABLE action")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testAsk_Available() throws Exception {
        // Arrange
        AiRequest request = new AiRequest();
        request.setAction("AVAILABLE");
        request.setGlassType("5MM");

        String expectedResponse = "Available stock data";
        when(stockService.getAvailableStock("5MM")).thenReturn(expectedResponse);

        // Act & Assert
        mockMvc.perform(post("/ai/ask")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string(expectedResponse));

        verify(stockService, times(1)).getAvailableStock("5MM");
    }

    @Test
    @DisplayName("POST /ai/ask - Success: INSTALLED action")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testAsk_Installed() throws Exception {
        // Arrange
        AiRequest request = new AiRequest();
        request.setAction("INSTALLED");
        request.setSite("Site1");

        String expectedResponse = "Installed glass data";
        when(installationService.getInstalledGlassByClient("Site1")).thenReturn(expectedResponse);

        // Act & Assert
        mockMvc.perform(post("/ai/ask")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string(expectedResponse));

        verify(installationService, times(1)).getInstalledGlassByClient("Site1");
    }

    @Test
    @DisplayName("POST /ai/ask - Success: PREDICT action")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testAsk_Predict() throws Exception {
        // Arrange
        AiRequest request = new AiRequest();
        request.setAction("PREDICT");

        String expectedResponse = "Prediction data";
        when(predictionService.predictFutureDemand()).thenReturn(expectedResponse);

        // Act & Assert
        mockMvc.perform(post("/ai/ask")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string(expectedResponse));

        verify(predictionService, times(1)).predictFutureDemand();
    }

    @Test
    @DisplayName("POST /ai/ask - Failure: Invalid action")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testAsk_InvalidAction() throws Exception {
        // Arrange
        AiRequest request = new AiRequest();
        request.setAction("INVALID_ACTION");

        // Act & Assert
        mockMvc.perform(post("/ai/ask")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("❌ Invalid option selected"));

        verify(stockService, never()).getLowStockData();
        verify(installationService, never()).getInstalledGlassByClient(anyString());
        verify(predictionService, never()).predictFutureDemand();
    }
}

