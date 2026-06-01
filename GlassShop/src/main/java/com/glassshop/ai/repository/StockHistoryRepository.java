package com.glassshop.ai.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.glassshop.ai.entity.StockHistory;

public interface StockHistoryRepository extends JpaRepository<StockHistory, Long> {

    StockHistory findTopByShopIdOrderByCreatedAtDesc(Long shopId);
}
