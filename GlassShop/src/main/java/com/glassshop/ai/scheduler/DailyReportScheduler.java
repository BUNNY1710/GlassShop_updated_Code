package com.glassshop.ai.scheduler;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.glassshop.ai.service.DailyReportService;

/**
 * Scheduled task to send daily reports at 11 PM
 * Cron expression: second, minute, hour, day, month, weekday
 * 0 0 23 * * ? = Every day at 11:00 PM
 */
@Component
public class DailyReportScheduler {

    @Autowired
    private DailyReportService dailyReportService;

    /**
     * Send daily reports every day at 11:00 PM
     */
    @Scheduled(cron = "0 0 23 * * ?")
    public void sendDailyReports() {
        System.out.println("📊 Starting daily report generation at 11:00 PM...");
        try {
            dailyReportService.generateAndSendReportsForAllShops();
            System.out.println("✅ Daily reports sent successfully");
        } catch (Exception e) {
            System.err.println("❌ Error sending daily reports: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Test method - runs every 5 minutes for testing
     * Uncomment this for testing, comment out the 11 PM one above
     */
    // @Scheduled(cron = "0 */5 * * * ?")
    // public void testDailyReports() {
    //     System.out.println("🧪 Testing daily report generation...");
    //     dailyReportService.generateAndSendReportsForAllShops();
    // }
}







