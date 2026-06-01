
package com.glassshop.ai.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.glassshop.ai.dto.StockActivityDto;
import com.glassshop.ai.dto.StockTransferRequest;
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

@Service
public class StockService {

    @Autowired
    private StockRepository stockRepository;

    @Autowired
    private GlassRepository glassRepository;

    @Autowired
    private StockHistoryRepository historyRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    /* ===============================
       ADD / REMOVE STOCK
       =============================== */
    public String updateStock(StockUpdateRequest request) {

//        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
//        User user = userRepository.findByUserName(auth.getName()).orElseThrow();
    	
    	Authentication auth = SecurityContextHolder.getContext().getAuthentication();

    	if (auth == null || !auth.isAuthenticated()
    	        || "anonymousUser".equals(auth.getName())) {
    	    return "❌ User not authenticated";
    	}

    	String username = auth.getName();

    	User user = userRepository.findByUserName(username)
    	        .orElse(null);

    	if (user == null) {
    	    return "❌ User not found in system. Please login again.";
    	}


        // ✅ CRITICAL: User must belong to a shop
        Shop shop = user.getShop();
        if (shop == null) {
            return "❌ User is not linked to any shop";
        }

        /* ---------- GLASS ---------- */
        int thickness;
        try {
            thickness = Integer.parseInt(
                request.getGlassType().toUpperCase().replace("MM", "").trim()
            );
        } catch (Exception e) {
            return "❌ Invalid glass type format (use 5MM, 8MM)";
        }

        Glass glass = glassRepository
            .findByTypeAndThicknessAndUnit(
                request.getGlassType().toUpperCase(),
                thickness,
                request.getUnit()
            )
            .orElseGet(() -> {
                Glass g = new Glass();
                g.setType(request.getGlassType().toUpperCase());
                g.setThickness(thickness);
                g.setUnit(request.getUnit());
                return glassRepository.save(g);
            });



        /* ---------- STOCK ---------- */
        /* ---------- STOCK ---------- */
        Stock stock = stockRepository
        	    .findByGlassAndStandNoAndShop(
        	        glass,
        	        request.getStandNo(),
        	        shop
        	    )
        	    .orElse(null);

        	if (stock == null) {
        	    stock = new Stock();
        	    stock.setGlass(glass);
        	    stock.setStandNo(request.getStandNo());
        	    stock.setQuantity(0);
        	    stock.setMinQuantity(5);
        	    stock.setShop(shop);

        	    // ✅ SAVE DIMENSIONS HERE
        	    stock.setHeight(request.getHeight());
        	    stock.setWidth(request.getWidth());
        	}
        	
        	// ✅ SAVE HSN NUMBER (for both new and existing stock)
        	if (request.getHsnNo() != null && !request.getHsnNo().trim().isEmpty()) {
        	    stock.setHsnNo(request.getHsnNo().trim());
        	}

        if ("ADD".equalsIgnoreCase(request.getAction())) {
            stock.setQuantity(stock.getQuantity() + request.getQuantity());
        }
        else if ("REMOVE".equalsIgnoreCase(request.getAction())) {
            if (stock.getQuantity() < request.getQuantity()) {
                return "❌ Not enough stock";
            }
            stock.setQuantity(stock.getQuantity() - request.getQuantity());
        }

        // ✅ SAVE AFTER SHOP IS SET
        stockRepository.save(stock);



        /* ---------- AUDIT LOG ---------- */
//        AuditLog log = new AuditLog();
//        log.setUsername(user.getUserName());
//        log.setRole(user.getRole());
//        log.setAction(request.getAction());
//        log.setGlassType(glass.getType());
//        log.setQuantity(request.getQuantity());
//        log.setStandNo(request.getStandNo());
//        log.setHeight(request.getHeight());
//        log.setWidth(request.getWidth());
//        log.setUnit(request.getUnit());
//        log.setTimestamp(LocalDateTime.now());
//        log.setShop(shop);
//
//        auditLogRepository.save(log);

        AuditLog log = new AuditLog();
        log.setUsername(user.getUserName());
        log.setRole(user.getRole());
        log.setAction(request.getAction());
        log.setGlassType(glass.getType());
        log.setQuantity(request.getQuantity());
        log.setStandNo(request.getStandNo());
        log.setHeight(request.getHeight());
        log.setWidth(request.getWidth());
        log.setUnit(request.getUnit());
        log.setTimestamp(LocalDateTime.now());

        // ✅ THIS IS CRITICAL
        log.setShop(shop);

        auditLogRepository.save(log);



        /* ---------- HISTORY (UNDO) ---------- */
        StockHistory history = new StockHistory();
        history.setGlassId(glass.getId());
        history.setStandNo(stock.getStandNo());
        history.setQuantity(request.getQuantity());
        history.setAction(request.getAction());
        history.setShop(shop);

        historyRepository.save(history);

        /* ---------- LOW STOCK EMAIL (ASYNC - NON-BLOCKING) ---------- */
        if (stock.getQuantity() < stock.getMinQuantity()) {
            // Send email asynchronously - won't block the response
            emailService.sendLowStockAlert(
                shop.getEmail(),   // ✅ SHOP ADMIN EMAIL
                "LOW STOCK ALERT 🚨\n\n" +
                "Shop: " + shop.getShopName() + "\n" +
                "Glass: " + glass.getType() + "\n" +
                "Stand: " + stock.getStandNo() + "\n" +
                "Height: " + stock.getHeight() + "\n" +
                "Width: " + stock.getWidth() + "\n" +
                "Quantity Left: " + stock.getQuantity() + "\n" +
                "Minimum Required: " + stock.getMinQuantity()
            );
        }


        return "✅ Stock updated successfully";
    }

    /* ===============================
       VIEW STOCK (SHOP ISOLATED)
       =============================== */
    public List<Stock> getAllStock() {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getName())) {
            return List.of(); // no crash
        }

        String username = auth.getName();

        User user = userRepository.findByUserName(username).orElse(null);

        if (user == null) {
            return List.of(); // user deleted / token stale
        }

        Shop shop = user.getShop();
        if (shop == null) {
            return List.of();
        }

        return stockRepository.findByShopId(shop.getId());
    }

    public String getLowStockData() {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        User user =
                userRepository.findByUserName(auth.getName()).orElseThrow();

        Shop shop = user.getShop();
        if (shop == null) {
            return "No shop assigned";
        }

        List<Stock> stocks =
                stockRepository.findLowStockByShopId(shop.getId());

        if (stocks.isEmpty()) {
            return "No glass is currently low in stock.";
        }

        StringBuilder sb = new StringBuilder();

        for (Stock s : stocks) {
            sb.append("Glass: ")
              .append(s.getGlass().getType())
              .append(", Qty: ")
              .append(s.getQuantity())
              .append(", Stand: ")
              .append(s.getStandNo())
              .append("\n");
        }

        return sb.toString();
    }
    
    public String getAvailableStock(String glassType) {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        User user =
                userRepository.findByUserName(auth.getName()).orElseThrow();

        Shop shop = user.getShop();
        if (shop == null) {
            return "No shop assigned";
        }

        List<Stock> stocks;

        if (glassType == null || glassType.isEmpty()) {
            stocks = stockRepository.findByShopId(shop.getId());
        } else {
            stocks = stockRepository
                    .findByShopId(shop.getId());
        }

        if (stocks.isEmpty()) {
            return "No stock available.";
        }

        StringBuilder sb = new StringBuilder();

        for (Stock s : stocks) {
            sb.append("Glass: ")
              .append(s.getGlass().getType())
              .append(", Thickness: ")
              .append(s.getGlass().getThickness())
              .append("mm, Qty: ")
              .append(s.getQuantity())
              .append("\n");
        }

        return sb.toString();
    }
    
    public String undoLastAction() {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        User user = userRepository
                .findByUserName(auth.getName())
                .orElseThrow();

        Shop shop = user.getShop();

        // ✅ Find last action ONLY for this shop
        StockHistory last = historyRepository
                .findTopByShopIdOrderByCreatedAtDesc(shop.getId());

        if (last == null) {
            return "❌ No action to undo";
        }

        Stock stock = stockRepository
                .findByGlass_Id(last.getGlassId())
                .orElseThrow();

        if ("ADD".equalsIgnoreCase(last.getAction())) {
            if (stock.getQuantity() < last.getQuantity()) {
                return "❌ Cannot undo. Stock already changed.";
            }
            stock.setQuantity(stock.getQuantity() - last.getQuantity());
        }
        else if ("REMOVE".equalsIgnoreCase(last.getAction())) {
            stock.setQuantity(stock.getQuantity() + last.getQuantity());
        }

        stockRepository.save(stock);
        historyRepository.delete(last);

        return "✅ Last action undone successfully";
    }


//    public List<StockActivityDto> getRecentStockActivity(int limit) {
//
//        Authentication auth =
//                SecurityContextHolder.getContext().getAuthentication();
//
//        String username = auth.getName();
//
//        User user = userRepository.findByUserName(username)
//                .orElseThrow(() -> new RuntimeException("User not found"));
//
//        Shop shop = user.getShop();
//        if (shop == null) {
//            return List.of();
//        }
//
//        return auditLogRepository
//                .findTop3ByShopOrderByTimestampDesc(shop)
//                .stream()
//                .map(log -> new StockActivityDto(
//                        log.getUsername(),
//                        log.getAction(),
//                        log.getGlassType(),
//                        log.getQuantity(),
//                        log.getStandNo(),
//                        log.getTimestamp()
//                ))
//                .toList();
//    }
    
    public List<StockActivityDto> getRecentStockActivity(int limit) {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        // ✅ No auth OR anonymous user → return empty list
        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getName())) {
            return List.of();
        }

        String username = auth.getName();

        Optional<User> optionalUser =
                userRepository.findByUserName(username);

        // ✅ User not found → return empty list (DON'T CRASH)
        if (optionalUser.isEmpty()) {
            return List.of();
        }

        User user = optionalUser.get();
        Shop shop = user.getShop();

        if (shop == null) {
            return List.of();
        }

        return auditLogRepository
                .findTop3ByShopOrderByTimestampDesc(shop)
                .stream()
                .map(log -> new StockActivityDto(
                        log.getUsername(),
                        log.getAction(),
                        log.getGlassType(),
                        log.getQuantity(),
                        log.getStandNo(),
                        log.getTimestamp()
                ))
                .toList();
    }


    public String transferStock(StockTransferRequest request) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getName())) {
            return "❌ User not authenticated";
        }

        User user = userRepository.findByUserName(auth.getName()).orElse(null);
        if (user == null || user.getShop() == null) {
            return "❌ User or shop not found";
        }

        Shop shop = user.getShop();

        if (request.getFromStand() == request.getToStand()) {
            return "❌ From stand and To stand cannot be same";
        }

        // ✅ SAFE thickness parsing
        int thickness;
        try {
            thickness = Integer.parseInt(
                request.getGlassType().toUpperCase().replace("MM", "").trim()
            );
        } catch (Exception e) {
            return "❌ Invalid glass type";
        }

        Glass glass = glassRepository
            .findByTypeAndThicknessAndUnit(
                request.getGlassType().toUpperCase(),
                thickness,
                request.getUnit()
            )
            .orElse(null);

        if (glass == null) {
            return "❌ Glass type not found";
        }

        // ✅ FIND STOCK USING HEIGHT + WIDTH
        Stock fromStock = stockRepository
        	    .findByGlassAndHeightAndWidthAndStandNoAndShop(
        	        glass,
        	        request.getHeight(),
        	        request.getWidth(),
        	        request.getFromStand(),
        	        shop
        	    )
        	    .orElse(null);




        if (fromStock == null ||
            fromStock.getQuantity() < request.getQuantity()) {
            return "❌ Not enough stock in source stand";
        }

        Stock toStock = stockRepository
        	    .findByGlassAndHeightAndWidthAndStandNoAndShop(
        	        glass,
        	        request.getHeight(),
        	        request.getWidth(),
        	        request.getToStand(),
        	        shop
        	    )
        	    .orElse(null);




        if (toStock == null) {
            toStock = new Stock();
            toStock.setGlass(glass);
            toStock.setStandNo(request.getToStand());
            toStock.setQuantity(0);
            toStock.setMinQuantity(5);
            toStock.setShop(shop);
            toStock.setHeight(fromStock.getHeight());	
            toStock.setWidth(fromStock.getWidth());
        }

        fromStock.setQuantity(fromStock.getQuantity() - request.getQuantity());
        toStock.setQuantity(toStock.getQuantity() + request.getQuantity());

        stockRepository.save(fromStock);
        stockRepository.save(toStock);

        // ✅ AUDIT LOG
//        AuditLog log = new AuditLog();
//        log.setUsername(user.getUserName());
//        log.setRole(user.getRole());
//        log.setAction("TRANSFER");
//        log.setGlassType(glass.getType());
//        log.setQuantity(request.getQuantity());
//        log.setStandNo(request.getFromStand());
//        log.setFromStand(request.getFromStand());
//        log.setToStand(request.getToStand());
//        log.setHeight(fromStock.getHeight());
//        log.setWidth(fromStock.getWidth());
//        log.setUnit(glass.getUnit());
//        log.setTimestamp(LocalDateTime.now());
//        log.setShop(shop);
//
//        auditLogRepository.save(log);
        
        AuditLog log = new AuditLog();
        log.setUsername(user.getUserName());
        log.setRole(user.getRole());
        log.setAction("TRANSFER");
        log.setGlassType(glass.getType());

        // ✅ SET POSITIVE QUANTITY TO SHOW AMOUNT TRANSFERRED
        log.setQuantity(request.getQuantity());

        // ✅ USE fromStand & toStand
        log.setFromStand(request.getFromStand());
        log.setToStand(request.getToStand());

        // ✅ Set standNo to source stand (where transfer originated)
        log.setStandNo(request.getFromStand());

        log.setHeight(fromStock.getHeight());
        log.setWidth(fromStock.getWidth());
        log.setUnit(glass.getUnit());
        log.setTimestamp(LocalDateTime.now());
        log.setShop(shop);

        auditLogRepository.save(log);



        return "✅ Stock transferred successfully";
    }
    
    public List<AuditLog> getAllAuditLogs() {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getName())) {
            return List.of();
        }

        User user = userRepository.findByUserName(auth.getName()).orElse(null);
        if (user == null || user.getShop() == null) {
            return List.of();
        }

        return auditLogRepository
                .findByShopOrderByTimestampDesc(user.getShop());
    }



}
