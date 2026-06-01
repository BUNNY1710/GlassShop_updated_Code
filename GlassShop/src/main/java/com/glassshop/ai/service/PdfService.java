package com.glassshop.ai.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.glassshop.ai.entity.Invoice;
import com.glassshop.ai.entity.Quotation;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.InvoiceRepository;
import com.glassshop.ai.repository.QuotationRepository;
import com.glassshop.ai.repository.UserRepository;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
public class PdfService {

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private UserRepository userRepository;

    private Shop getCurrentShop() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            throw new RuntimeException("User not authenticated");
        }
        String username = auth.getName();
        User user = userRepository.findByUserName(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Shop shop = user.getShop();
        if (shop == null) {
            throw new RuntimeException("Shop not found");
        }
        return shop;
    }

    /**
     * Generate PDF for Quotation/Cutting-Pad
     */
    public byte[] generateQuotationPdf(Long quotationId) throws IOException {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));
        
        Shop shop = getCurrentShop();
        if (!quotation.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Unauthorized access to quotation");
        }

        PDDocument document = new PDDocument();
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);

        PDPageContentStream contentStream = new PDPageContentStream(document, page);

        float margin = 50;
        float yPosition = 750;
        float lineHeight = 20;
        float currentY = yPosition;

        // Title
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 20);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("QUOTATION / CUTTING-PAD");
        contentStream.endText();
        currentY -= lineHeight * 2;

        // Shop Details
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("From:");
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        if (shop.getShopName() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText(shop.getShopName());
            contentStream.endText();
            currentY -= lineHeight;
        }
        if (shop.getOwnerName() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Owner: " + shop.getOwnerName());
            contentStream.endText();
            currentY -= lineHeight;
        }
        if (shop.getEmail() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Email: " + shop.getEmail());
            contentStream.endText();
            currentY -= lineHeight;
        }
        if (shop.getWhatsappNumber() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Mobile: " + shop.getWhatsappNumber());
            contentStream.endText();
            currentY -= lineHeight;
        }

        currentY -= lineHeight;

        // Customer Details
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("To:");
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText(quotation.getCustomerName());
        contentStream.endText();
        currentY -= lineHeight;

        if (quotation.getCustomerMobile() != null && !quotation.getCustomerMobile().isEmpty()) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Mobile: " + quotation.getCustomerMobile());
            contentStream.endText();
            currentY -= lineHeight;
        }

        if (quotation.getCustomerAddress() != null && !quotation.getCustomerAddress().isEmpty()) {
            String[] addressLines = quotation.getCustomerAddress().split("\n");
            for (String line : addressLines) {
                if (currentY < 100) {
                    contentStream.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    contentStream = new PDPageContentStream(document, page);
                    currentY = 750;
                }
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, currentY);
                contentStream.showText(line);
                contentStream.endText();
                currentY -= lineHeight;
            }
        }

        if (quotation.getCustomerGstin() != null && !quotation.getCustomerGstin().isEmpty()) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("GSTIN: " + quotation.getCustomerGstin());
            contentStream.endText();
            currentY -= lineHeight;
        }

        currentY -= lineHeight;

        // Quotation Details
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Quotation Number: " + quotation.getQuotationNumber());
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Date: " + quotation.getQuotationDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
        contentStream.endText();
        currentY -= lineHeight;

        if (quotation.getValidUntil() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Valid Until: " + quotation.getValidUntil().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
            contentStream.endText();
            currentY -= lineHeight;
        }

        currentY -= lineHeight;

        // Items Table Header
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
        float tableY = currentY;
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Item");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 150, tableY);
        contentStream.showText("Size");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 250, tableY);
        contentStream.showText("Qty");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 300, tableY);
        contentStream.showText("Rate");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 400, tableY);
        contentStream.showText("Amount");
        contentStream.endText();
        tableY -= lineHeight;

        // Draw line
        contentStream.moveTo(margin, tableY);
        contentStream.lineTo(margin + 500, tableY);
        contentStream.stroke();
        tableY -= 5;

        // Items
        contentStream.setFont(PDType1Font.HELVETICA, 9);
        for (var item : quotation.getItems()) {
            if (tableY < 100) {
                contentStream.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                contentStream = new PDPageContentStream(document, page);
                tableY = 750;
            }

            String itemDesc = item.getGlassType() != null ? item.getGlassType() : "";
            if (item.getThickness() != null) {
                itemDesc += " (" + item.getThickness() + "mm)";
            }

            contentStream.beginText();
            contentStream.newLineAtOffset(margin, tableY);
            contentStream.showText(itemDesc);
            contentStream.endText();

            String size = "";
            if (item.getHeight() != null && item.getWidth() != null) {
                size = String.format("%.2f", item.getHeight()) + " × " + String.format("%.2f", item.getWidth());
                if (item.getHeightUnit() != null) {
                    size += " " + item.getHeightUnit();
                }
            }
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 150, tableY);
            contentStream.showText(size);
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 250, tableY);
            contentStream.showText(String.valueOf(item.getQuantity()));
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 300, tableY);
            contentStream.showText(String.format("%.2f", item.getRatePerSqft() != null ? item.getRatePerSqft() : 0.0));
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 400, tableY);
            contentStream.showText(String.format("%.2f", item.getSubtotal() != null ? item.getSubtotal() : 0.0));
            contentStream.endText();

            tableY -= lineHeight;
        }

        tableY -= lineHeight;
        contentStream.moveTo(margin, tableY);
        contentStream.lineTo(margin + 500, tableY);
        contentStream.stroke();
        tableY -= lineHeight;

        // Totals
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 300, tableY);
        contentStream.showText("Subtotal:");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 400, tableY);
        contentStream.showText(String.format("%.2f", quotation.getSubtotal() != null ? quotation.getSubtotal() : 0.0));
        contentStream.endText();
        tableY -= lineHeight;

        if (quotation.getInstallationCharge() != null && quotation.getInstallationCharge() > 0) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 300, tableY);
            contentStream.showText("Installation:");
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 400, tableY);
            contentStream.showText(String.format("%.2f", quotation.getInstallationCharge()));
            contentStream.endText();
            tableY -= lineHeight;
        }

        if (quotation.getTransportCharge() != null && quotation.getTransportCharge() > 0) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 300, tableY);
            contentStream.showText("Transport:");
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 400, tableY);
            contentStream.showText(String.format("%.2f", quotation.getTransportCharge()));
            contentStream.endText();
            tableY -= lineHeight;
        }

        if (quotation.getDiscount() != null && quotation.getDiscount() > 0) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 300, tableY);
            contentStream.showText("Discount:");
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 400, tableY);
            contentStream.showText("-" + String.format("%.2f", quotation.getDiscount()));
            contentStream.endText();
            tableY -= lineHeight;
        }

        if (quotation.getBillingType().toString().equals("GST") && quotation.getGstAmount() != null && quotation.getGstAmount() > 0) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 300, tableY);
            contentStream.showText("GST (" + (quotation.getGstPercentage() != null ? quotation.getGstPercentage() : 0) + "%):");
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 400, tableY);
            contentStream.showText(String.format("%.2f", quotation.getGstAmount()));
            contentStream.endText();
            tableY -= lineHeight;
        }

        tableY -= lineHeight;
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 300, tableY);
        contentStream.showText("Grand Total:");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 400, tableY);
        contentStream.showText("Rs. " + String.format("%.2f", quotation.getGrandTotal() != null ? quotation.getGrandTotal() : 0.0));
        contentStream.endText();

        contentStream.close();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        document.save(baos);
        document.close();

        return baos.toByteArray();
    }

    /**
     * Generate PDF for Delivery Challan
     */
    public byte[] generateTransportChallanPdf(Long invoiceId) throws IOException {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        
        Shop shop = getCurrentShop();
        if (!invoice.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Unauthorized access to invoice");
        }

        PDDocument document = new PDDocument();
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);

        PDPageContentStream contentStream = new PDPageContentStream(document, page);

        float margin = 50;
        float yPosition = 750;
        float lineHeight = 20;
        float currentY = yPosition;

        // Title
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 24);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("DELIVERY CHALLAN");
        contentStream.endText();
        currentY -= lineHeight * 2;

        // Invoice/Challan Number
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Challan No: " + invoice.getInvoiceNumber());
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Date: " + invoice.getInvoiceDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
        contentStream.endText();
        currentY -= lineHeight * 2;

        // From (Shop) Details
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("From:");
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        if (shop.getShopName() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText(shop.getShopName());
            contentStream.endText();
            currentY -= lineHeight;
        }
        if (shop.getOwnerName() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Owner: " + shop.getOwnerName());
            contentStream.endText();
            currentY -= lineHeight;
        }
        if (shop.getEmail() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Email: " + shop.getEmail());
            contentStream.endText();
            currentY -= lineHeight;
        }
        if (shop.getWhatsappNumber() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Mobile: " + shop.getWhatsappNumber());
            contentStream.endText();
            currentY -= lineHeight;
        }

        currentY -= lineHeight;

        // To (Customer) Details
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("To:");
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText(invoice.getCustomerName());
        contentStream.endText();
        currentY -= lineHeight;

        if (invoice.getCustomerMobile() != null && !invoice.getCustomerMobile().isEmpty()) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Mobile: " + invoice.getCustomerMobile());
            contentStream.endText();
            currentY -= lineHeight;
        }

        if (invoice.getCustomerAddress() != null && !invoice.getCustomerAddress().isEmpty()) {
            String[] addressLines = invoice.getCustomerAddress().split("\n");
            for (String line : addressLines) {
                if (currentY < 100) {
                    contentStream.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    contentStream = new PDPageContentStream(document, page);
                    currentY = 750;
                }
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, currentY);
                contentStream.showText(line);
                contentStream.endText();
                currentY -= lineHeight;
            }
        }

        currentY -= lineHeight;

        // Items Table Header
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
        float tableY = currentY;
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Sr.");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 50, tableY);
        contentStream.showText("Description");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 250, tableY);
        contentStream.showText("Size");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 350, tableY);
        contentStream.showText("Qty");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 400, tableY);
        contentStream.showText("Remarks");
        contentStream.endText();
        tableY -= lineHeight;

        // Draw line
        contentStream.moveTo(margin, tableY);
        contentStream.lineTo(margin + 500, tableY);
        contentStream.stroke();
        tableY -= 5;

        // Items
        contentStream.setFont(PDType1Font.HELVETICA, 9);
        int srNo = 1;
        for (var item : invoice.getItems()) {
            if (tableY < 100) {
                contentStream.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                contentStream = new PDPageContentStream(document, page);
                tableY = 750;
            }

            contentStream.beginText();
            contentStream.newLineAtOffset(margin, tableY);
            contentStream.showText(String.valueOf(srNo++));
            contentStream.endText();

            String itemDesc = item.getGlassType() != null ? item.getGlassType() : "";
            if (item.getThickness() != null) {
                itemDesc += " (" + item.getThickness() + "mm)";
            }

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 50, tableY);
            contentStream.showText(itemDesc);
            contentStream.endText();

            String size = "";
            if (item.getHeight() != null && item.getWidth() != null) {
                size = String.format("%.2f", item.getHeight()) + " × " + String.format("%.2f", item.getWidth());
            }
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 250, tableY);
            contentStream.showText(size);
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 350, tableY);
            contentStream.showText(String.valueOf(item.getQuantity()));
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 400, tableY);
            contentStream.showText("Good Condition");
            contentStream.endText();

            tableY -= lineHeight;
        }

        tableY -= lineHeight * 2;

        // Signature Section
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Received By:");
        contentStream.endText();
        tableY -= lineHeight * 3;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("_____________________");
        contentStream.endText();
        tableY -= lineHeight;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("(Signature & Stamp)");
        contentStream.endText();
        tableY -= lineHeight * 2;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 300, tableY);
        contentStream.showText("Delivered By:");
        contentStream.endText();
        tableY -= lineHeight * 3;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 300, tableY);
        contentStream.showText("_____________________");
        contentStream.endText();
        tableY -= lineHeight;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 300, tableY);
        contentStream.showText("(Signature & Stamp)");
        contentStream.endText();

        contentStream.close();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        document.save(baos);
        document.close();

        return baos.toByteArray();
    }

    /**
     * Generate PDF for Delivery Challan Print (Order details only, no prices)
     */
    public byte[] generateDeliveryChallanPrintPdf(Long invoiceId) throws IOException {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        
        Shop shop = getCurrentShop();
        if (!invoice.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Unauthorized access to invoice");
        }

        PDDocument document = new PDDocument();
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);

        PDPageContentStream contentStream = new PDPageContentStream(document, page);

        float margin = 50;
        float yPosition = 750;
        float lineHeight = 20;
        float currentY = yPosition;

        // Title
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 24);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("DELIVERY CHALLAN");
        contentStream.endText();
        currentY -= lineHeight * 2;

        // Challan Number
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Challan No: " + invoice.getInvoiceNumber());
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Date: " + invoice.getInvoiceDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
        contentStream.endText();
        currentY -= lineHeight * 2;

        // From (Shop) Details
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("From:");
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        if (shop.getShopName() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText(shop.getShopName());
            contentStream.endText();
            currentY -= lineHeight;
        }
        if (shop.getOwnerName() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Owner: " + shop.getOwnerName());
            contentStream.endText();
            currentY -= lineHeight;
        }
        if (shop.getWhatsappNumber() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Mobile: " + shop.getWhatsappNumber());
            contentStream.endText();
            currentY -= lineHeight;
        }

        currentY -= lineHeight;

        // To (Customer) Details
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("To:");
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText(invoice.getCustomerName());
        contentStream.endText();
        currentY -= lineHeight;

        if (invoice.getCustomerMobile() != null && !invoice.getCustomerMobile().isEmpty()) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Mobile: " + invoice.getCustomerMobile());
            contentStream.endText();
            currentY -= lineHeight;
        }

        if (invoice.getCustomerAddress() != null && !invoice.getCustomerAddress().isEmpty()) {
            String[] addressLines = invoice.getCustomerAddress().split("\n");
            for (String line : addressLines) {
                if (currentY < 100) {
                    contentStream.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    contentStream = new PDPageContentStream(document, page);
                    currentY = 750;
                }
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, currentY);
                contentStream.showText(line);
                contentStream.endText();
                currentY -= lineHeight;
            }
        }

        currentY -= lineHeight;

        // Items Table Header (NO PRICE COLUMNS)
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
        float tableY = currentY;
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Sr.");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 50, tableY);
        contentStream.showText("Description");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 250, tableY);
        contentStream.showText("Size");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 350, tableY);
        contentStream.showText("Qty");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 400, tableY);
        contentStream.showText("Remarks");
        contentStream.endText();
        tableY -= lineHeight;

        // Draw line
        contentStream.moveTo(margin, tableY);
        contentStream.lineTo(margin + 500, tableY);
        contentStream.stroke();
        tableY -= 5;

        // Items (NO PRICES)
        contentStream.setFont(PDType1Font.HELVETICA, 9);
        int srNo = 1;
        for (var item : invoice.getItems()) {
            if (tableY < 100) {
                contentStream.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                contentStream = new PDPageContentStream(document, page);
                tableY = 750;
            }

            contentStream.beginText();
            contentStream.newLineAtOffset(margin, tableY);
            contentStream.showText(String.valueOf(srNo++));
            contentStream.endText();

            String itemDesc = item.getGlassType() != null ? item.getGlassType() : "";
            if (item.getThickness() != null) {
                itemDesc += " (" + item.getThickness() + "mm)";
            }

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 50, tableY);
            contentStream.showText(itemDesc);
            contentStream.endText();

            String size = "";
            if (item.getHeight() != null && item.getWidth() != null) {
                size = String.format("%.2f", item.getHeight()) + " × " + String.format("%.2f", item.getWidth());
            }
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 250, tableY);
            contentStream.showText(size);
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 350, tableY);
            contentStream.showText(String.valueOf(item.getQuantity()));
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 400, tableY);
            contentStream.showText("Good Condition");
            contentStream.endText();

            tableY -= lineHeight;
        }

        tableY -= lineHeight * 2;

        // Signature Section
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Received By:");
        contentStream.endText();
        tableY -= lineHeight * 3;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("_____________________");
        contentStream.endText();
        tableY -= lineHeight;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("(Signature & Stamp)");
        contentStream.endText();
        tableY -= lineHeight * 2;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 300, tableY);
        contentStream.showText("Delivered By:");
        contentStream.endText();
        tableY -= lineHeight * 3;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 300, tableY);
        contentStream.showText("_____________________");
        contentStream.endText();
        tableY -= lineHeight;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 300, tableY);
        contentStream.showText("(Signature & Stamp)");
        contentStream.endText();

        contentStream.close();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        document.save(baos);
        document.close();

        return baos.toByteArray();
    }

    /**
     * Generate PDF for Cutting-Pad Print (Dimensions only, no prices)
     */
    public byte[] generateCuttingPadPrintPdf(Long quotationId) throws IOException {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));
        
        Shop shop = getCurrentShop();
        if (!quotation.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Unauthorized access to quotation");
        }

        PDDocument document = new PDDocument();
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);

        PDPageContentStream contentStream = new PDPageContentStream(document, page);

        float margin = 50;
        float yPosition = 750;
        float lineHeight = 20;
        float currentY = yPosition;

        // Title
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 20);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("CUTTING-PAD");
        contentStream.endText();
        currentY -= lineHeight * 2;

        // Quotation Details
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Quotation Number: " + quotation.getQuotationNumber());
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Date: " + quotation.getQuotationDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Customer: " + quotation.getCustomerName());
        contentStream.endText();
        currentY -= lineHeight * 2;

        // Items Table Header (DIMENSIONS ONLY, NO PRICES)
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
        float tableY = currentY;
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Sr.");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 50, tableY);
        contentStream.showText("Glass Type");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 200, tableY);
        contentStream.showText("Height");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 300, tableY);
        contentStream.showText("Width");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 400, tableY);
        contentStream.showText("Qty");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 450, tableY);
        contentStream.showText("Design");
        contentStream.endText();
        tableY -= lineHeight;

        // Draw line
        contentStream.moveTo(margin, tableY);
        contentStream.lineTo(margin + 500, tableY);
        contentStream.stroke();
        tableY -= 5;

        // Items (DIMENSIONS ONLY, NO PRICES)
        contentStream.setFont(PDType1Font.HELVETICA, 9);
        int srNo = 1;
        for (var item : quotation.getItems()) {
            if (tableY < 100) {
                contentStream.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                contentStream = new PDPageContentStream(document, page);
                tableY = 750;
            }

            contentStream.beginText();
            contentStream.newLineAtOffset(margin, tableY);
            contentStream.showText(String.valueOf(srNo++));
            contentStream.endText();

            String itemDesc = item.getGlassType() != null ? item.getGlassType() : "";
            if (item.getThickness() != null) {
                itemDesc += " (" + item.getThickness() + "mm)";
            }

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 50, tableY);
            contentStream.showText(itemDesc);
            contentStream.endText();

            // Height with unit
            String heightStr = "";
            if (item.getHeight() != null) {
                heightStr = String.format("%.2f", item.getHeight());
                if (item.getHeightUnit() != null) {
                    heightStr += " " + item.getHeightUnit();
                }
            }
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 200, tableY);
            contentStream.showText(heightStr);
            contentStream.endText();

            // Width with unit
            String widthStr = "";
            if (item.getWidth() != null) {
                widthStr = String.format("%.2f", item.getWidth());
                if (item.getWidthUnit() != null) {
                    widthStr += " " + item.getWidthUnit();
                }
            }
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 300, tableY);
            contentStream.showText(widthStr);
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 400, tableY);
            contentStream.showText(String.valueOf(item.getQuantity()));
            contentStream.endText();

            String design = "";
            if (item.getDesign() != null) {
                if ("POLISH".equals(item.getDesign())) {
                    design = "Polish";
                } else if ("BEVELING".equals(item.getDesign())) {
                    design = "Beveling";
                } else if ("HALF_ROUND".equals(item.getDesign())) {
                    design = "Half Round";
                } else {
                    design = item.getDesign();
                }
            }
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 450, tableY);
            contentStream.showText(design);
            contentStream.endText();

            tableY -= lineHeight;
        }

        contentStream.close();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        document.save(baos);
        document.close();

        return baos.toByteArray();
    }

    /**
     * Generate Final Original Invoice PDF (with shop name and all details)
     */
    public byte[] generateInvoicePdf(Long invoiceId) throws IOException {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        
        Shop shop = getCurrentShop();
        if (!invoice.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Unauthorized access to invoice");
        }

        PDDocument document = new PDDocument();
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);

        PDPageContentStream contentStream = new PDPageContentStream(document, page);

        float margin = 50;
        float yPosition = 750;
        float lineHeight = 20;
        float currentY = yPosition;

        // Title
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 24);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        String title = invoice.getBillingType().toString().equals("GST") ? "TAX INVOICE" : "BILL / CASH MEMO";
        contentStream.showText(title);
        contentStream.endText();
        currentY -= lineHeight * 2;

        // Shop Details (From)
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 14);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("From:");
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        if (shop.getShopName() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText(shop.getShopName());
            contentStream.endText();
            currentY -= lineHeight;
        }
        
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        if (shop.getOwnerName() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Owner: " + shop.getOwnerName());
            contentStream.endText();
            currentY -= lineHeight;
        }
        if (shop.getEmail() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Email: " + shop.getEmail());
            contentStream.endText();
            currentY -= lineHeight;
        }
        if (shop.getWhatsappNumber() != null) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Mobile: " + shop.getWhatsappNumber());
            contentStream.endText();
            currentY -= lineHeight;
        }

        currentY -= lineHeight;

        // Customer Details (To)
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("To:");
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText(invoice.getCustomerName());
        contentStream.endText();
        currentY -= lineHeight;

        if (invoice.getCustomerMobile() != null && !invoice.getCustomerMobile().isEmpty()) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Mobile: " + invoice.getCustomerMobile());
            contentStream.endText();
            currentY -= lineHeight;
        }

        if (invoice.getCustomerAddress() != null && !invoice.getCustomerAddress().isEmpty()) {
            String[] addressLines = invoice.getCustomerAddress().split("\n");
            for (String line : addressLines) {
                if (currentY < 100) {
                    contentStream.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    contentStream = new PDPageContentStream(document, page);
                    currentY = 750;
                }
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, currentY);
                contentStream.showText(line);
                contentStream.endText();
                currentY -= lineHeight;
            }
        }

        if (invoice.getCustomerGstin() != null && !invoice.getCustomerGstin().isEmpty()) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("GSTIN: " + invoice.getCustomerGstin());
            contentStream.endText();
            currentY -= lineHeight;
        }

        currentY -= lineHeight;

        // Invoice Details
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Invoice Number: " + invoice.getInvoiceNumber());
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Date: " + invoice.getInvoiceDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Invoice Type: " + invoice.getInvoiceType().toString());
        contentStream.endText();
        currentY -= lineHeight * 2;

        // Items Table Header
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
        float tableY = currentY;
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Sr.");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 50, tableY);
        contentStream.showText("Item");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 200, tableY);
        contentStream.showText("Size");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 300, tableY);
        contentStream.showText("Qty");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 350, tableY);
        contentStream.showText("Rate");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 450, tableY);
        contentStream.showText("Amount");
        contentStream.endText();
        tableY -= lineHeight;

        // Draw line
        contentStream.moveTo(margin, tableY);
        contentStream.lineTo(margin + 500, tableY);
        contentStream.stroke();
        tableY -= 5;

        // Items
        contentStream.setFont(PDType1Font.HELVETICA, 9);
        int srNo = 1;
        for (var item : invoice.getItems()) {
            if (tableY < 100) {
                contentStream.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                contentStream = new PDPageContentStream(document, page);
                tableY = 750;
            }

            contentStream.beginText();
            contentStream.newLineAtOffset(margin, tableY);
            contentStream.showText(String.valueOf(srNo++));
            contentStream.endText();

            String itemDesc = item.getGlassType() != null ? item.getGlassType() : "";
            if (item.getThickness() != null) {
                itemDesc += " (" + item.getThickness() + "mm)";
            }

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 50, tableY);
            contentStream.showText(itemDesc);
            contentStream.endText();

            String size = "";
            if (item.getHeight() != null && item.getWidth() != null) {
                size = String.format("%.2f", item.getHeight()) + " × " + String.format("%.2f", item.getWidth()) + " ft";
            }
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 200, tableY);
            contentStream.showText(size);
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 300, tableY);
            contentStream.showText(String.valueOf(item.getQuantity()));
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 350, tableY);
            contentStream.showText(String.format("%.2f", item.getRatePerSqft() != null ? item.getRatePerSqft() : 0.0));
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 450, tableY);
            contentStream.showText(String.format("%.2f", item.getSubtotal() != null ? item.getSubtotal() : 0.0));
            contentStream.endText();

            tableY -= lineHeight;
        }

        tableY -= lineHeight;
        contentStream.moveTo(margin, tableY);
        contentStream.lineTo(margin + 500, tableY);
        contentStream.stroke();
        tableY -= lineHeight;

        // Totals
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 350, tableY);
        contentStream.showText("Subtotal:");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 450, tableY);
        contentStream.showText(String.format("%.2f", invoice.getSubtotal() != null ? invoice.getSubtotal() : 0.0));
        contentStream.endText();
        tableY -= lineHeight;

        if (invoice.getInstallationCharge() != null && invoice.getInstallationCharge() > 0) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 350, tableY);
            contentStream.showText("Installation:");
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 450, tableY);
            contentStream.showText(String.format("%.2f", invoice.getInstallationCharge()));
            contentStream.endText();
            tableY -= lineHeight;
        }

        if (invoice.getTransportCharge() != null && invoice.getTransportCharge() > 0) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 350, tableY);
            contentStream.showText("Transport:");
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 450, tableY);
            contentStream.showText(String.format("%.2f", invoice.getTransportCharge()));
            contentStream.endText();
            tableY -= lineHeight;
        }

        if (invoice.getDiscount() != null && invoice.getDiscount() > 0) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 350, tableY);
            contentStream.showText("Discount:");
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 450, tableY);
            contentStream.showText("-" + String.format("%.2f", invoice.getDiscount()));
            contentStream.endText();
            tableY -= lineHeight;
        }

        if (invoice.getBillingType().toString().equals("GST") && invoice.getGstAmount() != null && invoice.getGstAmount() > 0) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 350, tableY);
            contentStream.showText("GST (" + (invoice.getGstPercentage() != null ? invoice.getGstPercentage() : 0) + "%):");
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 450, tableY);
            contentStream.showText(String.format("%.2f", invoice.getGstAmount()));
            contentStream.endText();
            tableY -= lineHeight;
        }

        tableY -= lineHeight;
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 350, tableY);
        contentStream.showText("Grand Total:");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 450, tableY);
        contentStream.showText("Rs. " + String.format("%.2f", invoice.getGrandTotal() != null ? invoice.getGrandTotal() : 0.0));
        contentStream.endText();
        tableY -= lineHeight * 2;

        // Payment Status
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Payment Status: " + invoice.getPaymentStatus().toString());
        contentStream.endText();
        tableY -= lineHeight;
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Paid: Rs. " + String.format("%.2f", invoice.getPaidAmount() != null ? invoice.getPaidAmount() : 0.0));
        contentStream.endText();
        tableY -= lineHeight;
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Due: Rs. " + String.format("%.2f", invoice.getDueAmount() != null ? invoice.getDueAmount() : 0.0));
        contentStream.endText();

        contentStream.close();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        document.save(baos);
        document.close();

        return baos.toByteArray();
    }

    /**
     * Generate Basic Invoice PDF (without shop name and logo)
     */
    public byte[] generateBasicInvoicePdf(Long invoiceId) throws IOException {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        
        Shop shop = getCurrentShop();
        if (!invoice.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Unauthorized access to invoice");
        }

        PDDocument document = new PDDocument();
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);

        PDPageContentStream contentStream = new PDPageContentStream(document, page);

        float margin = 50;
        float yPosition = 750;
        float lineHeight = 20;
        float currentY = yPosition;

        // Title (NO SHOP NAME)
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 24);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        String title = invoice.getBillingType().toString().equals("GST") ? "TAX INVOICE" : "BILL / CASH MEMO";
        contentStream.showText(title);
        contentStream.endText();
        currentY -= lineHeight * 2;

        // Customer Details (To) - NO "From" section
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("To:");
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText(invoice.getCustomerName());
        contentStream.endText();
        currentY -= lineHeight;

        if (invoice.getCustomerMobile() != null && !invoice.getCustomerMobile().isEmpty()) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("Mobile: " + invoice.getCustomerMobile());
            contentStream.endText();
            currentY -= lineHeight;
        }

        if (invoice.getCustomerAddress() != null && !invoice.getCustomerAddress().isEmpty()) {
            String[] addressLines = invoice.getCustomerAddress().split("\n");
            for (String line : addressLines) {
                if (currentY < 100) {
                    contentStream.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    contentStream = new PDPageContentStream(document, page);
                    currentY = 750;
                }
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, currentY);
                contentStream.showText(line);
                contentStream.endText();
                currentY -= lineHeight;
            }
        }

        if (invoice.getCustomerGstin() != null && !invoice.getCustomerGstin().isEmpty()) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, currentY);
            contentStream.showText("GSTIN: " + invoice.getCustomerGstin());
            contentStream.endText();
            currentY -= lineHeight;
        }

        currentY -= lineHeight;

        // Invoice Details
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Invoice Number: " + invoice.getInvoiceNumber());
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Date: " + invoice.getInvoiceDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
        contentStream.endText();
        currentY -= lineHeight;

        contentStream.beginText();
        contentStream.newLineAtOffset(margin, currentY);
        contentStream.showText("Invoice Type: " + invoice.getInvoiceType().toString());
        contentStream.endText();
        currentY -= lineHeight * 2;

        // Items Table Header
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
        float tableY = currentY;
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Sr.");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 50, tableY);
        contentStream.showText("Item");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 200, tableY);
        contentStream.showText("Size");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 300, tableY);
        contentStream.showText("Qty");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 350, tableY);
        contentStream.showText("Rate");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 450, tableY);
        contentStream.showText("Amount");
        contentStream.endText();
        tableY -= lineHeight;

        // Draw line
        contentStream.moveTo(margin, tableY);
        contentStream.lineTo(margin + 500, tableY);
        contentStream.stroke();
        tableY -= 5;

        // Items
        contentStream.setFont(PDType1Font.HELVETICA, 9);
        int srNo = 1;
        for (var item : invoice.getItems()) {
            if (tableY < 100) {
                contentStream.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                contentStream = new PDPageContentStream(document, page);
                tableY = 750;
            }

            contentStream.beginText();
            contentStream.newLineAtOffset(margin, tableY);
            contentStream.showText(String.valueOf(srNo++));
            contentStream.endText();

            String itemDesc = item.getGlassType() != null ? item.getGlassType() : "";
            if (item.getThickness() != null) {
                itemDesc += " (" + item.getThickness() + "mm)";
            }

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 50, tableY);
            contentStream.showText(itemDesc);
            contentStream.endText();

            String size = "";
            if (item.getHeight() != null && item.getWidth() != null) {
                size = String.format("%.2f", item.getHeight()) + " × " + String.format("%.2f", item.getWidth()) + " ft";
            }
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 200, tableY);
            contentStream.showText(size);
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 300, tableY);
            contentStream.showText(String.valueOf(item.getQuantity()));
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 350, tableY);
            contentStream.showText(String.format("%.2f", item.getRatePerSqft() != null ? item.getRatePerSqft() : 0.0));
            contentStream.endText();

            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 450, tableY);
            contentStream.showText(String.format("%.2f", item.getSubtotal() != null ? item.getSubtotal() : 0.0));
            contentStream.endText();

            tableY -= lineHeight;
        }

        tableY -= lineHeight;
        contentStream.moveTo(margin, tableY);
        contentStream.lineTo(margin + 500, tableY);
        contentStream.stroke();
        tableY -= lineHeight;

        // Totals
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 350, tableY);
        contentStream.showText("Subtotal:");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 450, tableY);
        contentStream.showText(String.format("%.2f", invoice.getSubtotal() != null ? invoice.getSubtotal() : 0.0));
        contentStream.endText();
        tableY -= lineHeight;

        if (invoice.getInstallationCharge() != null && invoice.getInstallationCharge() > 0) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 350, tableY);
            contentStream.showText("Installation:");
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 450, tableY);
            contentStream.showText(String.format("%.2f", invoice.getInstallationCharge()));
            contentStream.endText();
            tableY -= lineHeight;
        }

        if (invoice.getTransportCharge() != null && invoice.getTransportCharge() > 0) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 350, tableY);
            contentStream.showText("Transport:");
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 450, tableY);
            contentStream.showText(String.format("%.2f", invoice.getTransportCharge()));
            contentStream.endText();
            tableY -= lineHeight;
        }

        if (invoice.getDiscount() != null && invoice.getDiscount() > 0) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 350, tableY);
            contentStream.showText("Discount:");
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 450, tableY);
            contentStream.showText("-" + String.format("%.2f", invoice.getDiscount()));
            contentStream.endText();
            tableY -= lineHeight;
        }

        if (invoice.getBillingType().toString().equals("GST") && invoice.getGstAmount() != null && invoice.getGstAmount() > 0) {
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 350, tableY);
            contentStream.showText("GST (" + (invoice.getGstPercentage() != null ? invoice.getGstPercentage() : 0) + "%):");
            contentStream.endText();
            contentStream.beginText();
            contentStream.newLineAtOffset(margin + 450, tableY);
            contentStream.showText(String.format("%.2f", invoice.getGstAmount()));
            contentStream.endText();
            tableY -= lineHeight;
        }

        tableY -= lineHeight;
        contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 350, tableY);
        contentStream.showText("Grand Total:");
        contentStream.endText();
        contentStream.beginText();
        contentStream.newLineAtOffset(margin + 450, tableY);
        contentStream.showText("Rs. " + String.format("%.2f", invoice.getGrandTotal() != null ? invoice.getGrandTotal() : 0.0));
        contentStream.endText();
        tableY -= lineHeight * 2;

        // Payment Status
        contentStream.setFont(PDType1Font.HELVETICA, 10);
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Payment Status: " + invoice.getPaymentStatus().toString());
        contentStream.endText();
        tableY -= lineHeight;
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Paid: Rs. " + String.format("%.2f", invoice.getPaidAmount() != null ? invoice.getPaidAmount() : 0.0));
        contentStream.endText();
        tableY -= lineHeight;
        contentStream.beginText();
        contentStream.newLineAtOffset(margin, tableY);
        contentStream.showText("Due: Rs. " + String.format("%.2f", invoice.getDueAmount() != null ? invoice.getDueAmount() : 0.0));
        contentStream.endText();

        contentStream.close();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        document.save(baos);
        document.close();

        return baos.toByteArray();
    }
}

