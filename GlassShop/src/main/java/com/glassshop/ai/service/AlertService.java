package com.glassshop.ai.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.glassshop.ai.entity.Stock;
import com.glassshop.ai.repository.StockRepository;

@Service
public class AlertService {

    @Autowired
    private StockRepository stockRepository;
    
    @Autowired
    private EmailService emailService;

    /**
     * Check low stock and send email alerts (async - non-blocking)
     */
    public String checkLowStockOnly() {

        List<Stock> lowStocks = stockRepository.findLowStock();

        if (lowStocks.isEmpty()) {
            return "✅ All glass stock levels are healthy.";
        }

        StringBuilder alertMsg = new StringBuilder("⚠ LOW STOCK ALERT\n\n");
        
        // Track shops to send emails to (avoid duplicate emails)
        java.util.Set<String> emailsSent = new java.util.HashSet<>();

        for (Stock s : lowStocks) {
            if (s.getGlass() == null || s.getShop() == null) continue;

            alertMsg.append("Glass: ")
                    .append(s.getGlass().getType())
                    .append("\nStand: ")
                    .append(s.getStandNo())
                    .append("\nHeight: ")
                    .append(s.getHeight() != null ? s.getHeight() : "N/A")
                    .append("\nWidth: ")
                    .append(s.getWidth() != null ? s.getWidth() : "N/A")
                    .append("\nAvailable: ")
                    .append(s.getQuantity())
                    .append("\nMinimum: ")
                    .append(s.getMinQuantity())
                    .append("\n\n");
            
            // Send email alert for each low stock item (async - non-blocking)
            String shopEmail = s.getShop().getEmail();
            if (shopEmail != null && !shopEmail.isEmpty() && !emailsSent.contains(shopEmail)) {
                String emailMessage = "LOW STOCK ALERT 🚨\n\n" +
                    "Shop: " + s.getShop().getShopName() + "\n" +
                    "Glass: " + s.getGlass().getType() + "\n" +
                    "Stand: " + s.getStandNo() + "\n" +
                    "Height: " + (s.getHeight() != null ? s.getHeight() : "N/A") + "\n" +
                    "Width: " + (s.getWidth() != null ? s.getWidth() : "N/A") + "\n" +
                    "Quantity Left: " + s.getQuantity() + "\n" +
                    "Minimum Required: " + s.getMinQuantity() + "\n\n" +
                    "Please reorder stock immediately!";
                
                emailService.sendLowStockAlert(shopEmail, emailMessage);
                emailsSent.add(shopEmail);
            }
        }

        return alertMsg.toString();
    }
}
