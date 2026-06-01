package com.glassshop.ai.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.glassshop.ai.entity.AuditLog;
import com.glassshop.ai.entity.Shop;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

	List<AuditLog> findTop10ByShopIdOrderByTimestampDesc(Long shopId);

	List<AuditLog> findByShop(Shop shop);
	
	List<AuditLog> findByShopOrderByTimestampDesc(Shop shop);

	
	List<AuditLog> findTop3ByShopIdOrderByTimestampDesc(Long shopId);
	
	List<AuditLog> findTop3ByShopOrderByTimestampDesc(Shop shop);
	
	// Find most recent audit log for specific stock (for updating quantity during transfer)
	Optional<AuditLog> findTopByShopAndGlassTypeAndStandNoAndHeightAndWidthOrderByTimestampDesc(
            Shop shop, String glassType, int standNo, String height, String width);
    
	List<AuditLog> findByShopAndTimestampBetween(
            Shop shop,
            LocalDateTime start,
            LocalDateTime end
    );

    // 🔹 Most used glass types
    @Query("""
        SELECT a.glassType, SUM(a.quantity)
        FROM AuditLog a
        WHERE a.shop = :shop AND a.action = 'REMOVE'
        GROUP BY a.glassType
        ORDER BY SUM(a.quantity) DESC
    """)
    List<Object[]> findMostUsedGlassTypes(Shop shop);

    // 🔹 Count TRANSFER actions for a shop (case-insensitive)
    @Query("""
        SELECT COUNT(a)
        FROM AuditLog a
        WHERE a.shop = :shop AND UPPER(TRIM(a.action)) = 'TRANSFER'
    """)
    Long countTransfersByShop(Shop shop);

    
}
