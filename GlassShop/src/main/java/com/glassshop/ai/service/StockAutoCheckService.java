package com.glassshop.ai.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class StockAutoCheckService {

	@Scheduled(cron = "0 0 9 * * ?")
    public void dailyStockCheck() {

        System.out.println("🔁 Daily stock auto-check started");

        // TEMP logic (later connect DB)
        int lowStockItems = 3;
        int overStockItems = 1;

        if (lowStockItems > 0) {
            System.out.println("⚠ ALERT: Low stock detected");
        }

        if (overStockItems > 0) {
            System.out.println("ℹ Over stock detected");
        }
    }
}
