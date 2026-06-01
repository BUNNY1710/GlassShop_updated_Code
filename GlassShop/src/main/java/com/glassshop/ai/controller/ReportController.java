//package com.glassshop.ai.controller;
//
//import java.util.List;
//import java.util.Map;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.security.access.prepost.PreAuthorize;
//import org.springframework.web.bind.annotation.*;
//
////import com.glassshop.ai.service.ReportService;
//
//@RestController
//@RequestMapping("/reports")
//@CrossOrigin(origins = "http://localhost:3000")
//public class ReportController {
//
////    @Autowired
////    private ReportService reportService;
//
//    // 📈 Line chart
//    @GetMapping("/daily-usage")
//    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
//    public List<Map<String, Object>> dailyUsage() {
//        return reportService.getDailyUsage();
//    }
//
//    // 📊 Bar chart
//    @GetMapping("/most-used-glass")
//    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
//    public List<Map<String, Object>> mostUsedGlass() {
//        return reportService.getMostUsedGlass();
//    }
//}
