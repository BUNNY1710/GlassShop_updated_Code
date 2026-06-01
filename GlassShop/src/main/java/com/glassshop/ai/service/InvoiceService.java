package com.glassshop.ai.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.glassshop.ai.dto.AddPaymentRequest;
import com.glassshop.ai.dto.CreateInvoiceRequest;
import com.glassshop.ai.dto.InvoiceItemDto;
import com.glassshop.ai.dto.InvoiceResponse;
import com.glassshop.ai.dto.PaymentDto;
import com.glassshop.ai.entity.Invoice;
import com.glassshop.ai.entity.InvoiceItem;
import com.glassshop.ai.entity.Payment;
import com.glassshop.ai.entity.Quotation;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.enums.InvoiceType;
import com.glassshop.ai.enums.PaymentStatus;
import com.glassshop.ai.repository.InvoiceRepository;
import com.glassshop.ai.repository.QuotationRepository;
import com.glassshop.ai.repository.UserRepository;

@Service
public class InvoiceService {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private QuotationRepository quotationRepository;

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
            throw new RuntimeException("User is not linked to any shop");
        }
        return shop;
    }

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    private String generateInvoiceNumber(Shop shop, InvoiceType invoiceType) {
        // Format: INV-YYYY-MM-XXXX (e.g., INV-2024-01-0001)
        // For advance: ADV-YYYY-MM-XXXX
        String typePrefix = invoiceType == InvoiceType.ADVANCE ? "ADV-" : "INV-";
        String yearMonth = LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        final String prefix = typePrefix + yearMonth + "-";
        
        // Find the last invoice number for this month
        List<Invoice> recentInvoices = invoiceRepository.findByShop(shop)
                .stream()
                .filter(i -> i.getInvoiceNumber().startsWith(prefix))
                .collect(Collectors.toList());
        
        int nextNumber = recentInvoices.size() + 1;
        return prefix + String.format("%04d", nextNumber);
    }

    @Transactional
    public InvoiceResponse createInvoiceFromQuotation(CreateInvoiceRequest request) {
        Shop shop = getCurrentShop();
        Quotation quotation = quotationRepository.findById(request.getQuotationId())
                .orElseThrow(() -> new RuntimeException("Quotation not found"));
        
        if (!quotation.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Quotation does not belong to your shop");
        }

        if (quotation.getStatus() != com.glassshop.ai.enums.QuotationStatus.CONFIRMED) {
            throw new RuntimeException("Only confirmed quotations can be converted to invoices");
        }

        // Create invoice
        Invoice invoice = new Invoice();
        invoice.setShop(shop);
        invoice.setCustomer(quotation.getCustomer());
        invoice.setQuotation(quotation);
        invoice.setInvoiceNumber(generateInvoiceNumber(shop, request.getInvoiceType()));
        invoice.setInvoiceType(request.getInvoiceType());
        invoice.setBillingType(quotation.getBillingType());
        invoice.setInvoiceDate(request.getInvoiceDate() != null ? request.getInvoiceDate() : LocalDate.now());
        invoice.setCreatedBy(getCurrentUsername());

        // Copy customer details from quotation
        invoice.setCustomerName(quotation.getCustomerName());
        invoice.setCustomerMobile(quotation.getCustomerMobile());
        invoice.setCustomerAddress(quotation.getCustomerAddress());
        invoice.setCustomerGstin(quotation.getCustomerGstin());
        invoice.setCustomerState(quotation.getCustomerState());

        // Copy amounts from quotation
        invoice.setSubtotal(quotation.getSubtotal());
        invoice.setInstallationCharge(quotation.getInstallationCharge());
        invoice.setTransportCharge(quotation.getTransportCharge());
        invoice.setDiscount(quotation.getDiscount());

        // Copy GST fields
        invoice.setGstPercentage(quotation.getGstPercentage());
        invoice.setCgst(quotation.getCgst());
        invoice.setSgst(quotation.getSgst());
        invoice.setIgst(quotation.getIgst());
        invoice.setGstAmount(quotation.getGstAmount());
        invoice.setGrandTotal(quotation.getGrandTotal());

        // Initial payment status
        invoice.setPaymentStatus(PaymentStatus.DUE);
        invoice.setPaidAmount(0.0);
        invoice.setDueAmount(invoice.getGrandTotal());

        // Copy items from quotation
        List<InvoiceItem> items = new ArrayList<>();
        int order = 0;
        for (com.glassshop.ai.entity.QuotationItem qItem : quotation.getItems()) {
            InvoiceItem item = new InvoiceItem();
            item.setInvoice(invoice);
            item.setGlassType(qItem.getGlassType());
            item.setThickness(qItem.getThickness());
            item.setHeight(qItem.getHeight());
            item.setWidth(qItem.getWidth());
            item.setQuantity(qItem.getQuantity());
            item.setRatePerSqft(qItem.getRatePerSqft());
            item.setArea(qItem.getArea());
            item.setSubtotal(qItem.getSubtotal());
            item.setHsnCode(qItem.getHsnCode());
            item.setDescription(qItem.getDescription());
            item.setItemOrder(order++);
            items.add(item);
        }
        invoice.setItems(items);

        Invoice saved = invoiceRepository.save(invoice);
        return convertToResponse(saved);
    }

    public InvoiceResponse getInvoiceById(Long id) {
        Shop shop = getCurrentShop();
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        
        if (!invoice.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Invoice does not belong to your shop");
        }
        
        return convertToResponse(invoice);
    }

    public List<InvoiceResponse> getAllInvoices() {
        Shop shop = getCurrentShop();
        return invoiceRepository.findByShopOrderByCreatedAtDesc(shop)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public List<InvoiceResponse> getInvoicesByPaymentStatus(PaymentStatus paymentStatus) {
        Shop shop = getCurrentShop();
        return invoiceRepository.findByShopAndPaymentStatus(shop, paymentStatus)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PaymentDto addPayment(Long invoiceId, AddPaymentRequest request) {
        Shop shop = getCurrentShop();
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        
        if (!invoice.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Invoice does not belong to your shop");
        }

        // Create payment
        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setPaymentMode(request.getPaymentMode());
        payment.setAmount(request.getAmount());
        payment.setPaymentDate(request.getPaymentDate() != null ? request.getPaymentDate() : LocalDateTime.now());
        payment.setReferenceNumber(request.getReferenceNumber());
        payment.setBankName(request.getBankName());
        payment.setChequeNumber(request.getChequeNumber());
        payment.setTransactionId(request.getTransactionId());
        payment.setNotes(request.getNotes());
        payment.setCreatedBy(getCurrentUsername());

        Payment saved = paymentRepository.save(payment);

        // Update invoice payment status
        updateInvoicePaymentStatus(invoice);

        return convertPaymentToDto(saved);
    }

    private void updateInvoicePaymentStatus(Invoice invoice) {
        double totalPaid = invoice.getPayments().stream()
                .mapToDouble(Payment::getAmount)
                .sum();

        invoice.setPaidAmount(totalPaid);
        invoice.setDueAmount(invoice.getGrandTotal() - totalPaid);

        if (totalPaid >= invoice.getGrandTotal()) {
            invoice.setPaymentStatus(PaymentStatus.PAID);
        } else if (totalPaid > 0) {
            invoice.setPaymentStatus(PaymentStatus.PARTIAL);
        } else {
            invoice.setPaymentStatus(PaymentStatus.DUE);
        }

        invoiceRepository.save(invoice);
    }

    @Autowired
    private com.glassshop.ai.repository.PaymentRepository paymentRepository;

    private InvoiceResponse convertToResponse(Invoice invoice) {
        InvoiceResponse response = new InvoiceResponse();
        response.setId(invoice.getId());
        response.setCustomerId(invoice.getCustomer().getId());
        response.setQuotationId(invoice.getQuotation() != null ? invoice.getQuotation().getId() : null);
        response.setInvoiceNumber(invoice.getInvoiceNumber());
        response.setInvoiceType(invoice.getInvoiceType());
        response.setBillingType(invoice.getBillingType());
        response.setInvoiceDate(invoice.getInvoiceDate());
        response.setCustomerName(invoice.getCustomerName());
        response.setCustomerMobile(invoice.getCustomerMobile());
        response.setCustomerAddress(invoice.getCustomerAddress());
        response.setCustomerGstin(invoice.getCustomerGstin());
        response.setCustomerState(invoice.getCustomerState());
        response.setSubtotal(invoice.getSubtotal());
        response.setInstallationCharge(invoice.getInstallationCharge());
        response.setTransportCharge(invoice.getTransportCharge());
        response.setDiscount(invoice.getDiscount());
        response.setGstPercentage(invoice.getGstPercentage());
        response.setCgst(invoice.getCgst());
        response.setSgst(invoice.getSgst());
        response.setIgst(invoice.getIgst());
        response.setGstAmount(invoice.getGstAmount());
        response.setGrandTotal(invoice.getGrandTotal());
        response.setPaymentStatus(invoice.getPaymentStatus());
        response.setPaidAmount(invoice.getPaidAmount());
        response.setDueAmount(invoice.getDueAmount());
        response.setCreatedBy(invoice.getCreatedBy());
        response.setCreatedAt(invoice.getCreatedAt());
        response.setUpdatedAt(invoice.getUpdatedAt());

        // Convert items
        List<InvoiceItemDto> itemDtos = invoice.getItems().stream()
                .map(this::convertItemToDto)
                .collect(Collectors.toList());
        response.setItems(itemDtos);

        // Convert payments
        List<PaymentDto> paymentDtos = invoice.getPayments().stream()
                .map(this::convertPaymentToDto)
                .collect(Collectors.toList());
        response.setPayments(paymentDtos);

        return response;
    }

    private InvoiceItemDto convertItemToDto(InvoiceItem item) {
        InvoiceItemDto dto = new InvoiceItemDto();
        dto.setId(item.getId());
        dto.setGlassType(item.getGlassType());
        dto.setThickness(item.getThickness());
        dto.setHeight(item.getHeight());
        dto.setWidth(item.getWidth());
        dto.setQuantity(item.getQuantity());
        dto.setRatePerSqft(item.getRatePerSqft());
        dto.setArea(item.getArea());
        dto.setSubtotal(item.getSubtotal());
        dto.setHsnCode(item.getHsnCode());
        dto.setDescription(item.getDescription());
        dto.setItemOrder(item.getItemOrder());
        return dto;
    }

    private PaymentDto convertPaymentToDto(Payment payment) {
        PaymentDto dto = new PaymentDto();
        dto.setId(payment.getId());
        dto.setPaymentMode(payment.getPaymentMode());
        dto.setAmount(payment.getAmount());
        dto.setPaymentDate(payment.getPaymentDate());
        dto.setReferenceNumber(payment.getReferenceNumber());
        dto.setBankName(payment.getBankName());
        dto.setChequeNumber(payment.getChequeNumber());
        dto.setTransactionId(payment.getTransactionId());
        dto.setNotes(payment.getNotes());
        dto.setCreatedBy(payment.getCreatedBy());
        dto.setCreatedAt(payment.getCreatedAt());
        return dto;
    }
}

