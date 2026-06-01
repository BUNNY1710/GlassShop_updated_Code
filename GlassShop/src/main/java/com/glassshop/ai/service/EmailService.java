package com.glassshop.ai.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    /**
     * Send low stock alert to shop admin email (Async - non-blocking)
     */
    @Async("emailExecutor")
    public void sendLowStockAlert(String toEmail, String message) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(toEmail);
            mail.setSubject("⚠ Glass Shop - Low Stock Alert");
            mail.setText(message);

            mailSender.send(mail);
            System.out.println("✅ Low stock alert email sent to: " + toEmail);
        } catch (Exception e) {
            System.err.println("❌ Failed to send email to " + toEmail + ": " + e.getMessage());
        }
    }
}
