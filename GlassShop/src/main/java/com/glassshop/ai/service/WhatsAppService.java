package com.glassshop.ai.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class WhatsAppService {

    @Value("${whatsapp.api.url:}")
    private String whatsappApiUrl;

    @Value("${whatsapp.api.key:}")
    private String whatsappApiKey;

    @Value("${whatsapp.api.enabled:false}")
    private boolean whatsappEnabled;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    /**
     * Send WhatsApp message using configured API
     * Supports multiple providers: Twilio, WhatsApp Business API, etc.
     */
    public void sendMessage(String phoneNumber, String message) {
        if (!whatsappEnabled) {
            System.out.println("⚠ WhatsApp service is disabled. Message would be:");
            System.out.println("To: " + phoneNumber);
            System.out.println("Message: " + message);
            return;
        }

        if (whatsappApiUrl == null || whatsappApiUrl.isEmpty()) {
            System.err.println("❌ WhatsApp API URL not configured");
            return;
        }

        try {
            // Format phone number (remove + if present, ensure proper format)
            String formattedNumber = formatPhoneNumber(phoneNumber);

            // Build request based on API provider
            String requestBody = buildRequestBody(formattedNumber, message);
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(whatsappApiUrl))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + whatsappApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                System.out.println("✅ WhatsApp message sent successfully to " + formattedNumber);
            } else {
                System.err.println("❌ Failed to send WhatsApp message. Status: " + response.statusCode());
                System.err.println("Response: " + response.body());
            }
        } catch (Exception e) {
            System.err.println("❌ Error sending WhatsApp message: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Format phone number for WhatsApp API
     * Removes + and ensures proper format
     */
    private String formatPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            return phoneNumber;
        }
        // Remove any spaces, dashes, or plus signs
        String cleaned = phoneNumber.replaceAll("[\\s\\-+]", "");
        // Ensure it starts with country code (assume India if starts with 9 and length is 10)
        if (cleaned.length() == 10 && cleaned.startsWith("9")) {
            return "91" + cleaned; // Add India country code
        }
        return cleaned;
    }

    /**
     * Build request body for WhatsApp API
     * This can be customized based on your API provider
     * 
     * For Twilio WhatsApp API:
     * {
     *   "To": "whatsapp:+919876543210",
     *   "From": "whatsapp:+14155238886",
     *   "Body": "message"
     * }
     * 
     * For generic WhatsApp Business API:
     * {
     *   "phone": "919876543210",
     *   "message": "message"
     * }
     */
    private String buildRequestBody(String phoneNumber, String message) {
        // Default format for generic WhatsApp Business API
        // Modify this based on your provider
        return String.format(
            "{\"phone\":\"%s\",\"message\":\"%s\"}",
            phoneNumber,
            message.replace("\"", "\\\"").replace("\n", "\\n")
        );
    }
}







