package com.glassshop.ai.performance;

import static org.junit.jupiter.api.Assertions.*;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Performance Tests
 * Tests response times, concurrent requests, load handling
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Performance Tests")
class PerformanceTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Response Time Test: Login endpoint should respond within 2 seconds")
    void testResponseTime_Login() throws Exception {
        long startTime = System.currentTimeMillis();
        
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"test\",\"password\":\"test\"}"));
        
        long endTime = System.currentTimeMillis();
        long responseTime = endTime - startTime;
        
        assertTrue(responseTime < 2000, 
            "Login endpoint should respond within 2 seconds. Actual: " + responseTime + "ms");
    }

    @Test
    @DisplayName("Response Time Test: Get stock endpoint should respond within 1 second")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testResponseTime_GetStock() throws Exception {
        long startTime = System.currentTimeMillis();
        
        mockMvc.perform(get("/stock/all"));
        
        long endTime = System.currentTimeMillis();
        long responseTime = endTime - startTime;
        
        assertTrue(responseTime < 1000, 
            "Get stock endpoint should respond within 1 second. Actual: " + responseTime + "ms");
    }

    @Test
    @DisplayName("Concurrent Requests Test: Handle 10 concurrent requests")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testConcurrentRequests() throws Exception {
        int numberOfThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < numberOfThreads; i++) {
            executor.submit(() -> {
                try {
                    MvcResult result = mockMvc.perform(get("/stock/all"))
                            .andReturn();
                    if (result.getResponse().getStatus() == 200) {
                        successCount.incrementAndGet();
                    } else {
                        failureCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                }
            });
        }

        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);

        // At least 80% of requests should succeed
        int totalRequests = successCount.get() + failureCount.get();
        double successRate = (double) successCount.get() / totalRequests;
        
        assertTrue(successRate >= 0.8, 
            "At least 80% of concurrent requests should succeed. Success rate: " + successRate);
    }

    @Test
    @DisplayName("Load Test: Handle 50 sequential requests")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testLoad_SequentialRequests() throws Exception {
        int numberOfRequests = 50;
        long totalTime = 0;
        int successCount = 0;

        for (int i = 0; i < numberOfRequests; i++) {
            long startTime = System.currentTimeMillis();
            
            MvcResult result = mockMvc.perform(get("/stock/all"))
                    .andReturn();
            
            long endTime = System.currentTimeMillis();
            totalTime += (endTime - startTime);
            
            if (result.getResponse().getStatus() == 200) {
                successCount++;
            }
        }

        double averageResponseTime = (double) totalTime / numberOfRequests;
        double successRate = (double) successCount / numberOfRequests;

        assertTrue(averageResponseTime < 1000, 
            "Average response time should be under 1 second. Actual: " + averageResponseTime + "ms");
        assertTrue(successRate >= 0.95, 
            "Success rate should be at least 95%. Actual: " + successRate);
    }

    @Test
    @DisplayName("Memory Test: No memory leaks on repeated requests")
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void testMemory_NoLeaks() throws Exception {
        Runtime runtime = Runtime.getRuntime();
        long initialMemory = runtime.totalMemory() - runtime.freeMemory();

        // Make 100 requests
        for (int i = 0; i < 100; i++) {
            mockMvc.perform(get("/stock/all"));
        }

        // Force garbage collection
        System.gc();
        Thread.sleep(100);

        long finalMemory = runtime.totalMemory() - runtime.freeMemory();
        long memoryIncrease = finalMemory - initialMemory;

        // Memory increase should be reasonable (less than 50MB)
        assertTrue(memoryIncrease < 50 * 1024 * 1024, 
            "Memory increase should be less than 50MB. Actual: " + (memoryIncrease / 1024 / 1024) + "MB");
    }
}

