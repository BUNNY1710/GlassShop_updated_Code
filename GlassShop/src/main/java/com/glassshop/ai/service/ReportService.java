//package com.glassshop.ai.service;
//
//import java.time.LocalDate;
//import java.time.LocalDateTime;
//import java.util.*;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.security.core.context.SecurityContextHolder;
//import org.springframework.stereotype.Service;
//
//import com.glassshop.ai.entity.AuditLog;
//import com.glassshop.ai.entity.Shop;
//import com.glassshop.ai.entity.User;
//import com.glassshop.ai.repository.AuditLogRepository;
//import com.glassshop.ai.repository.UserRepository;
//
//@Service
//public class ReportService {
//
//    @Autowired
//    private AuditLogRepository auditLogRepository;
//
//    @Autowired
//    private UserRepository userRepository;
//
//    private Shop getCurrentShop() {
//        String username =
//                SecurityContextHolder.getContext()
//                        .getAuthentication()
//                        .getName();
//
//        User user = userRepository
//                .findByUserName(username)
//                .orElseThrow(() -> new RuntimeException("User not found"));
//
//        return user.getShop();
//    }
//
//    // 📈 Daily usage (last 7 days)
//    public List<Map<String, Object>> getDailyUsage() {
//        Shop shop = getCurrentShop();
//
//        LocalDateTime start =
//                LocalDate.now().minusDays(6).atStartOfDay();
//
//        List<AuditLog> logs =
//                auditLogRepository.findByShopAndTimestampBetween(
//                        shop,
//                        start,
//                        LocalDateTime.now()
//                );
//
//        Map<LocalDate, Integer> dailyMap = new TreeMap<>();
//
//        for (AuditLog log : logs) {
//            if (!"REMOVE".equals(log.getAction())) continue;
//
//            LocalDate date = log.getTimestamp().toLocalDate();
//            dailyMap.put(
//                    date,
//                    dailyMap.getOrDefault(date, 0) + log.getQuantity()
//            );
//        }
//
//        List<Map<String, Object>> result = new ArrayList<>();
//        dailyMap.forEach((date, qty) -> {
//            result.add(Map.of(
//                    "date", date.toString(),
//                    "quantity", qty
//            ));
//        });
//
//        return result;
//    }
//
//    // 📊 Most used glass
//    public List<Map<String, Object>> getMostUsedGlass() {
//        Shop shop = getCurrentShop();
//
//        List<Object[]> rows =
//                auditLogRepository.findMostUsedGlassTypes(shop);
//
//        List<Map<String, Object>> result = new ArrayList<>();
//
//        for (Object[] row : rows) {
//            result.add(Map.of(
//                    "glassType", row[0],
//                    "quantity", row[1]
//            ));
//        }
//
//        return result;
//    }
//}
