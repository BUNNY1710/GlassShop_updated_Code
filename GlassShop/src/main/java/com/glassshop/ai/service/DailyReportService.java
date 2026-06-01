package com.glassshop.ai.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.glassshop.ai.entity.AuditLog;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.AuditLogRepository;
import com.glassshop.ai.repository.ShopRepository;
import com.glassshop.ai.repository.UserRepository;

@Service
public class DailyReportService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WhatsAppService whatsAppService;

    /**
     * Generate and send daily sales report for a specific shop
     */
    public void generateAndSendDailyReport(Long shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found: " + shopId));

        // Get admin user for this shop
        List<User> admins = userRepository.findByShopIdAndRole(shopId, "ROLE_ADMIN");
        if (admins.isEmpty()) {
            // Try without ROLE_ prefix as fallback
            admins = userRepository.findByShopIdAndRole(shopId, "ADMIN");
        }
        if (admins.isEmpty()) {
            System.err.println("⚠ No admin found for shop: " + shop.getShopName());
            return;
        }

        User admin = admins.get(0);
        String whatsappNumber = admin.getWhatsappNumber() != null 
                ? admin.getWhatsappNumber() 
                : shop.getWhatsappNumber();

        if (whatsappNumber == null || whatsappNumber.isEmpty()) {
            System.err.println("⚠ No WhatsApp number found for shop: " + shop.getShopName());
            return;
        }

        // Get today's date range
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        // Get all REMOVE actions (sales) for today
        List<AuditLog> todaySales = auditLogRepository.findByShop(shop).stream()
                .filter(log -> log.getAction() != null && "REMOVE".equalsIgnoreCase(log.getAction()))
                .filter(log -> log.getTimestamp() != null 
                        && !log.getTimestamp().isBefore(startOfDay)
                        && !log.getTimestamp().isAfter(endOfDay))
                .collect(Collectors.toList());

        // Generate report message
        String report = generateReportMessage(shop, todaySales, today);

        // Send via WhatsApp
        whatsAppService.sendMessage(whatsappNumber, report);
    }

    /**
     * Generate report message for all shops (called by scheduled task)
     */
    public void generateAndSendReportsForAllShops() {
        List<Shop> shops = shopRepository.findAll();
        
        for (Shop shop : shops) {
            try {
                generateAndSendDailyReport(shop.getId());
                // Add delay between messages to avoid rate limiting
                Thread.sleep(2000); // 2 seconds delay
            } catch (Exception e) {
                System.err.println("❌ Error generating report for shop " + shop.getShopName() + ": " + e.getMessage());
                e.printStackTrace();
            }
        }
    }

    /**
     * Generate formatted report message
     */
    private String generateReportMessage(Shop shop, List<AuditLog> sales, LocalDate date) {
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy");
        
        StringBuilder report = new StringBuilder();
        report.append("📊 *Daily Sales Report*\n");
        report.append("━━━━━━━━━━━━━━━━━━━━\n");
        report.append("🏬 Shop: ").append(shop.getShopName()).append("\n");
        report.append("📅 Date: ").append(date.format(dateFormatter)).append("\n");
        report.append("━━━━━━━━━━━━━━━━━━━━\n\n");

        if (sales.isEmpty()) {
            report.append("📭 No sales today.\n");
            report.append("Total Earnings: ₹0\n");
        } else {
            // Group by glass type
            Map<String, List<AuditLog>> salesByType = sales.stream()
                    .collect(Collectors.groupingBy(AuditLog::getGlassType));

            int totalQuantitySold = 0;
            double totalEarnings = 0.0;

            report.append("📦 *Stock Sold:*\n\n");

            for (Map.Entry<String, List<AuditLog>> entry : salesByType.entrySet()) {
                String glassType = entry.getKey();
                List<AuditLog> logs = entry.getValue();
                
                int quantityForType = logs.stream()
                        .mapToInt(AuditLog::getQuantity)
                        .sum();
                
                totalQuantitySold += quantityForType;

                report.append("• *").append(glassType).append("*\n");
                for (AuditLog log : logs) {
                    String dimensions = formatDimensions(log.getHeight(), log.getWidth(), log.getUnit());
                    Double area = calculateArea(log.getHeight(), log.getWidth(), log.getUnit());
                    
                    // Use actual price from log if available, otherwise calculate
                    double pricePerUnit = log.getPrice() != null 
                            ? log.getPrice() 
                            : calculatePrice(glassType, area);
                    
                    double totalPrice = pricePerUnit * log.getQuantity();
                    totalEarnings += totalPrice;

                    report.append("  - Qty: ").append(log.getQuantity())
                          .append(" | Size: ").append(dimensions)
                          .append(" | Stand: ").append(log.getStandNo())
                          .append("\n");
                    
                    if (log.getQuantity() > 1) {
                        report.append("    Price: ₹").append(String.format("%.2f", pricePerUnit))
                              .append(" × ").append(log.getQuantity())
                              .append(" = ₹").append(String.format("%.2f", totalPrice))
                              .append("\n");
                    } else {
                        report.append("    Price: ₹").append(String.format("%.2f", pricePerUnit)).append("\n");
                    }
                }
                report.append("\n");
            }

            report.append("━━━━━━━━━━━━━━━━━━━━\n");
            report.append("📊 *Summary*\n");
            report.append("Total Items Sold: ").append(totalQuantitySold).append("\n");
            report.append("Total Earnings: ₹").append(String.format("%.2f", totalEarnings)).append("\n");
        }

        report.append("\n━━━━━━━━━━━━━━━━━━━━\n");
        report.append("Generated at: ").append(LocalDateTime.now().format(
                DateTimeFormatter.ofPattern("hh:mm a"))).append("\n");

        return report.toString();
    }

    /**
     * Format dimensions with unit
     */
    private String formatDimensions(String height, String width, String unit) {
        if (height == null || width == null) {
            return "N/A";
        }
        String unitStr = (unit != null && !unit.isEmpty()) ? unit : "mm";
        return height + " × " + width + " " + unitStr;
    }


    /**
     * Calculate area in square meters
     */
    private double calculateArea(String height, String width, String unit) {
        double h = parseDimension(height);
        double w = parseDimension(width);

        if (h <= 0 || w <= 0) {
            return 0.0;
        }

        // Convert to meters
        if ("MM".equalsIgnoreCase(unit)) {
            h = h / 1000.0;
            w = w / 1000.0;
        } else if ("INCH".equalsIgnoreCase(unit) || "IN".equalsIgnoreCase(unit)) {
            h = h * 0.0254;
            w = w * 0.0254;
        } else if ("FEET".equalsIgnoreCase(unit) || "FT".equalsIgnoreCase(unit)) {
            h = h * 0.3048;
            w = w * 0.3048;
        }

        return h * w;
    }
    /**
     * Converts dimension string to double
     * Supports:
     *  - 26
     *  - 26.5
     *  - 26 1/4
     */
    private double parseDimension(String value) {
        try {
            value = value.trim();

            // Case: "26 1/4"
            if (value.contains(" ")) {
                String[] parts = value.split(" ");
                double whole = Double.parseDouble(parts[0]);

                if (parts.length > 1 && parts[1].contains("/")) {
                    String[] fraction = parts[1].split("/");
                    double num = Double.parseDouble(fraction[0]);
                    double den = Double.parseDouble(fraction[1]);
                    return whole + (num / den);
                }
                return whole;
            }

            // Case: "1/4"
            if (value.contains("/")) {
                String[] fraction = value.split("/");
                return Double.parseDouble(fraction[0]) /
                       Double.parseDouble(fraction[1]);
            }

            // Case: "26" or "26.5"
            return Double.parseDouble(value);

        } catch (Exception e) {
            return 0.0; // safe fallback
        }
    }


    /**
     * Calculate price based on glass type and area
     * This is a basic pricing model - you can customize this
     */
    private double calculatePrice(String glassType, double area) {
        // Base price per square meter (customize these rates)
        double basePrice = 0.0;
        
        if (glassType != null) {
            if (glassType.contains("5MM") || glassType.contains("5")) {
                basePrice = 500.0; // ₹500 per sqm
            } else if (glassType.contains("8MM") || glassType.contains("8")) {
                basePrice = 800.0; // ₹800 per sqm
            } else if (glassType.contains("10MM") || glassType.contains("10")) {
                basePrice = 1000.0; // ₹1000 per sqm
            } else {
                basePrice = 400.0; // Default ₹400 per sqm
            }
        }

        return basePrice * area;
    }
}

