package com.glassshop.ai.service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.glassshop.ai.entity.AuditLog;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.Stock;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.AuditLogRepository;
import com.glassshop.ai.repository.StockRepository;
import com.glassshop.ai.repository.UserRepository;

/**
 * AI Stock Advisor Service
 * 
 * Provides data-driven business insights based on stock and audit data.
 * Uses keyword detection to route questions to appropriate analysis logic.
 * 
 * TODO: Integrate OpenAI API / LLM for natural language understanding
 * TODO: Add more sophisticated analysis (trends, seasonality, etc.)
 * TODO: Cache frequently requested insights
 */
@Service
public class AiStockAdvisorService {

    @Autowired
    private StockRepository stockRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Main entry point for AI Stock Advisor
     * Routes questions based on keyword detection
     * 
     * @param question Natural language question from user
     * @return Human-readable response with insights
     */
    public String getAdvice(String question) {
        if (question == null || question.trim().isEmpty()) {
            return "Please ask a question about your stock. For example: 'What should I reorder?'";
        }

        Shop shop = getCurrentShop();
        if (shop == null) {
            return "❌ Unable to identify your shop. Please ensure you are logged in.";
        }

        String lowerQuestion = question.toLowerCase().trim();

        // Keyword-based routing
        // TODO: Replace with LLM intent classification
        if (containsKeyword(lowerQuestion, "reorder", "restock", "low", "need", "should i buy")) {
            return getReorderSuggestions(shop);
        } else if (containsKeyword(lowerQuestion, "sell", "selling", "best", "popular", "most sold")) {
            return getBestSellingGlass(shop);
        } else if (containsKeyword(lowerQuestion, "dead", "slow", "stagnant", "not moving", "stuck")) {
            return getDeadStock(shop);
        } else if (containsKeyword(lowerQuestion, "stand", "frequent", "active", "movement", "busy")) {
            return getFrequentlyMovedStands(shop);
        } else {
            return "I can help you with:\n" +
                   "• Reorder suggestions (ask: 'What should I reorder?')\n" +
                   "• Best selling glass (ask: 'Which glass sells most?')\n" +
                   "• Dead stock (ask: 'Which glass is dead stock?')\n" +
                   "• Stand activity (ask: 'Which stand has frequent movement?')\n\n" +
                   "Try rephrasing your question using these keywords.";
        }
    }

    /**
     * A) REORDER SUGGESTION
     * Finds items with quantity < min_quantity, ranked by highest negative gap
     * Returns top 5 items with recommended reorder quantities
     */
    private String getReorderSuggestions(Shop shop) {
        List<Stock> lowStockItems = stockRepository.findLowStockByShopId(shop.getId());

        if (lowStockItems.isEmpty()) {
            return "✅ Great news! All your stock levels are above minimum thresholds. No reordering needed at this time.";
        }

        // Sort by gap (minQuantity - quantity) descending (highest gap first)
        List<Stock> sortedItems = lowStockItems.stream()
                .sorted(Comparator.comparingInt((Stock s) -> s.getMinQuantity() - s.getQuantity()).reversed())
                .limit(5)
                .collect(Collectors.toList());

        StringBuilder response = new StringBuilder();
        response.append("📋 REORDER SUGGESTIONS (Top 5 Priority Items):\n\n");

        for (int i = 0; i < sortedItems.size(); i++) {
            Stock stock = sortedItems.get(i);
            int currentQty = stock.getQuantity();
            int minQty = stock.getMinQuantity();
            int gap = minQty - currentQty;
            int recommendedQty = minQty * 2; // Recommended reorder quantity

            response.append(String.format("%d. %s (Stand #%d)\n", i + 1, 
                    stock.getGlass().getType(), stock.getStandNo()));
            response.append(String.format("   Current: %d units | Minimum: %d units | Gap: %d units\n", 
                    currentQty, minQty, gap));
            response.append(String.format("   💡 Recommended reorder: %d units\n\n", recommendedQty));
        }

        response.append(String.format("Total items needing reorder: %d", lowStockItems.size()));
        return response.toString();
    }

    /**
     * B) BEST SELLING GLASS
     * Analyzes REMOVE actions from audit_log in last 30 days
     * Aggregates by glass_type and sorts by total quantity sold
     */
    private String getBestSellingGlass(Shop shop) {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        List<AuditLog> recentRemovals = auditLogRepository.findByShopAndTimestampBetween(
                shop, thirtyDaysAgo, LocalDateTime.now())
                .stream()
                .filter(log -> "REMOVE".equals(log.getAction()) && log.getGlassType() != null)
                .collect(Collectors.toList());

        if (recentRemovals.isEmpty()) {
            return "📊 No sales data available for the last 30 days. Check back after some stock movements.";
        }

        // Aggregate by glass type
        Map<String, Integer> salesByType = recentRemovals.stream()
                .collect(Collectors.groupingBy(
                        AuditLog::getGlassType,
                        Collectors.summingInt(AuditLog::getQuantity)
                ));

        // Sort by total quantity descending
        List<Map.Entry<String, Integer>> sortedSales = salesByType.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(5)
                .collect(Collectors.toList());

        StringBuilder response = new StringBuilder();
        response.append("🏆 BEST SELLING GLASS (Last 30 Days):\n\n");

        for (int i = 0; i < sortedSales.size(); i++) {
            Map.Entry<String, Integer> entry = sortedSales.get(i);
            response.append(String.format("%d. %s - %d units sold\n", 
                    i + 1, entry.getKey(), entry.getValue()));
        }

        int totalSold = salesByType.values().stream().mapToInt(Integer::intValue).sum();
        response.append(String.format("\n📈 Total units sold in last 30 days: %d", totalSold));

        return response.toString();
    }

    /**
     * C) DEAD STOCK
     * Finds glass with:
     * - No REMOVE action in last 60 days
     * - quantity > 0 (still in stock)
     */
    private String getDeadStock(Shop shop) {
        LocalDateTime sixtyDaysAgo = LocalDateTime.now().minusDays(60);

        // Get all stock items for this shop
        List<Stock> allStock = stockRepository.findByShopId(shop.getId());

        // Get all REMOVE actions in last 60 days
        List<AuditLog> recentRemovals = auditLogRepository.findByShopAndTimestampBetween(
                shop, sixtyDaysAgo, LocalDateTime.now())
                .stream()
                .filter(log -> "REMOVE".equals(log.getAction()) && log.getGlassType() != null)
                .collect(Collectors.toList());

        // Create set of glass types that have been sold recently
        java.util.Set<String> activeGlassTypes = recentRemovals.stream()
                .map(AuditLog::getGlassType)
                .collect(Collectors.toSet());

        // Find dead stock: items with quantity > 0 but no recent sales
        List<Stock> deadStock = allStock.stream()
                .filter(stock -> stock.getQuantity() > 0)
                .filter(stock -> {
                    String glassType = stock.getGlass().getType();
                    return !activeGlassTypes.contains(glassType);
                })
                .sorted(Comparator.comparingInt(Stock::getQuantity).reversed()) // Highest quantity first
                .limit(10)
                .collect(Collectors.toList());

        if (deadStock.isEmpty()) {
            return "✅ Excellent! All your stock has been moving in the last 60 days. No dead stock detected.";
        }

        StringBuilder response = new StringBuilder();
        response.append("⚠️ DEAD STOCK (No sales in last 60 days):\n\n");

        // Group by glass type for cleaner output
        Map<String, List<Stock>> deadStockByType = deadStock.stream()
                .collect(Collectors.groupingBy(s -> s.getGlass().getType()));

        int index = 1;
        for (Map.Entry<String, List<Stock>> entry : deadStockByType.entrySet()) {
            String glassType = entry.getKey();
            List<Stock> stocks = entry.getValue();
            int totalQty = stocks.stream().mapToInt(Stock::getQuantity).sum();
            int standCount = stocks.size();

            response.append(String.format("%d. %s\n", index++, glassType));
            response.append(String.format("   Total quantity: %d units across %d stand(s)\n", 
                    totalQty, standCount));
            response.append(String.format("   Stands: %s\n\n", 
                    stocks.stream()
                            .map(s -> "#" + s.getStandNo())
                            .collect(Collectors.joining(", "))));
        }

        response.append("💡 Consider running promotions or reviewing pricing for these items.");
        return response.toString();
    }

    /**
     * D) FREQUENTLY MOVED STANDS
     * Counts all actions (ADD/REMOVE/TRANSFER) grouped by stand_no
     * Sorts by activity count descending
     */
    private String getFrequentlyMovedStands(Shop shop) {
        List<AuditLog> allLogs = auditLogRepository.findByShop(shop);

        if (allLogs.isEmpty()) {
            return "📊 No activity data available. Stand activity will appear after stock operations.";
        }

        // Count actions by stand number
        Map<Integer, Long> standActivity = allLogs.stream()
                .filter(log -> log.getStandNo() > 0) // Valid stand number
                .collect(Collectors.groupingBy(
                        AuditLog::getStandNo,
                        Collectors.counting()
                ));

        if (standActivity.isEmpty()) {
            return "📊 No stand activity data found.";
        }

        // Sort by activity count descending
        List<Map.Entry<Integer, Long>> sortedStands = standActivity.entrySet().stream()
                .sorted(Map.Entry.<Integer, Long>comparingByValue().reversed())
                .limit(10)
                .collect(Collectors.toList());

        StringBuilder response = new StringBuilder();
        response.append("📊 MOST ACTIVE STANDS (By total operations):\n\n");

        for (int i = 0; i < sortedStands.size(); i++) {
            Map.Entry<Integer, Long> entry = sortedStands.get(i);
            response.append(String.format("%d. Stand #%d - %d operations\n", 
                    i + 1, entry.getKey(), entry.getValue()));
        }

        // Additional insight: breakdown by action type for top stand
        if (!sortedStands.isEmpty()) {
            int topStand = sortedStands.get(0).getKey();
            Map<String, Long> actionBreakdown = allLogs.stream()
                    .filter(log -> log.getStandNo() == topStand)
                    .collect(Collectors.groupingBy(
                            AuditLog::getAction,
                            Collectors.counting()
                    ));

            response.append(String.format("\n📈 Stand #%d breakdown:\n", topStand));
            actionBreakdown.forEach((action, count) -> 
                    response.append(String.format("   %s: %d\n", action, count)));
        }

        return response.toString();
    }

    /**
     * Helper: Get current shop from authenticated user
     */
    private Shop getCurrentShop() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return null;
        }

        String username = auth.getName();
        User user = userRepository.findByUserName(username).orElse(null);
        
        return (user != null) ? user.getShop() : null;
    }

    /**
     * Helper: Check if question contains any of the keywords
     */
    private boolean containsKeyword(String question, String... keywords) {
        for (String keyword : keywords) {
            if (question.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}

