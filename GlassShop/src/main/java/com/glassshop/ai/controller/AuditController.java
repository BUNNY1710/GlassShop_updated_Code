package com.glassshop.ai.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.glassshop.ai.entity.AuditLog;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.AuditLogRepository;
import com.glassshop.ai.repository.UserRepository;
@RestController
@RequestMapping("/audit")
// Note: Class-level @PreAuthorize removed - using method-level annotations instead
public class AuditController {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/recent")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AuditLog> recentLogs() {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        // ✅ no auth / anonymous
        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getName())) {
            return List.of();
        }

        String username = auth.getName();

        User user = userRepository.findByUserName(username).orElse(null);

        // ✅ user deleted / token stale
        if (user == null) {
            return List.of();
        }

        Shop shop = user.getShop();
        if (shop == null) {
            return List.of();
        }

        return auditLogRepository
                .findByShopOrderByTimestampDesc(shop);
    }

    /**
     * Get transfer count - accessible by both ADMIN and STAFF
     * Returns only the count of TRANSFER actions, not the full audit logs
     */
    @GetMapping("/transfer-count")
    public Long getTransferCount() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            if (auth == null || !auth.isAuthenticated()
                    || "anonymousUser".equals(auth.getName())) {
                return 0L;
            }

            String username = auth.getName();
            User user = userRepository.findByUserName(username).orElse(null);

            if (user == null || user.getShop() == null) {
                return 0L;
            }

            Shop shop = user.getShop();
            
            // Use repository query method for better performance
            Long count = auditLogRepository.countTransfersByShop(shop);
            
            return (count != null) ? count : 0L;
        } catch (Exception e) {
            // Log error and return 0
            System.err.println("Error getting transfer count: " + e.getMessage());
            return 0L;
        }
    }

    
//    @GetMapping("/audit/download")
//    @PreAuthorize("hasRole('ADMIN')")
//    public void downloadAuditLog(HttpServletResponse response) throws IOException {
//
//        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
//        User user = userRepository.findByUserName(auth.getName()).orElseThrow();
//
//        List<AuditLog> logs =
//                auditLogRepository.findByShopOrderByTimestampDesc(user.getShop());
//
//        response.setContentType("text/csv");
//        response.setHeader(
//                "Content-Disposition",
//                "attachment; filename=audit-log-report.csv"
//        );
//
//        CSVPrinter csvPrinter = new CSVPrinter(
//                response.getWriter(),
//                CSVFormat.DEFAULT.withHeader(
//                        "Username",
//                        "Role",
//                        "Action",
//                        "Glass Type",
//                        "Quantity",
//                        "Stand No",
//                        "Height",
//                        "Width",
//                        "Unit",
//                        "Date"
//                )
//        );
//
//        for (AuditLog log : logs) {
//            csvPrinter.printRecord(
//                    log.getUsername(),
//                    log.getRole(),
//                    log.getAction(),
//                    log.getGlassType(),
//                    log.getQuantity(),
//                    log.getStandNo(),
//                    log.getHeight(),
//                    log.getWidth(),
//                    log.getUnit(),
//                    log.getTimestamp()
//            );
//        }
//
//        csvPrinter.flush();
//    }
//

}
