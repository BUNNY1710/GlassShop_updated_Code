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

import com.glassshop.ai.dto.ConfirmQuotationRequest;
import com.glassshop.ai.dto.CreateQuotationRequest;
import com.glassshop.ai.dto.QuotationItemDto;
import com.glassshop.ai.dto.QuotationResponse;
import com.glassshop.ai.entity.Customer;
import com.glassshop.ai.entity.Quotation;
import com.glassshop.ai.entity.QuotationItem;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.enums.BillingType;
import com.glassshop.ai.enums.QuotationStatus;
import com.glassshop.ai.repository.CustomerRepository;
import com.glassshop.ai.repository.QuotationRepository;
import com.glassshop.ai.repository.UserRepository;

@Service
public class QuotationService {

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private CustomerRepository customerRepository;

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

    private String generateQuotationNumber(Shop shop) {
        // Format: Q-YYYY-MM-XXXX (e.g., Q-2024-01-0001)
        String yearMonth = LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        String prefix = "Q-" + yearMonth + "-";
        
        // Find the last quotation number for this month
        List<Quotation> recentQuotations = quotationRepository.findByShop(shop)
                .stream()
                .filter(q -> q.getQuotationNumber().startsWith(prefix))
                .collect(Collectors.toList());
        
        int nextNumber = recentQuotations.size() + 1;
        return prefix + String.format("%04d", nextNumber);
    }

    @Transactional
    public QuotationResponse createQuotation(CreateQuotationRequest request) {
        Shop shop = getCurrentShop();
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        
        if (!customer.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Customer does not belong to your shop");
        }

        // Validate GST fields if billing type is GST
        if (request.getBillingType() == BillingType.GST) {
            if (request.getGstPercentage() == null || request.getGstPercentage() <= 0) {
                throw new RuntimeException("GST percentage is required for GST billing");
            }
        }

        // Create quotation
        Quotation quotation = new Quotation();
        quotation.setShop(shop);
        quotation.setCustomer(customer);
        quotation.setQuotationNumber(generateQuotationNumber(shop));
        quotation.setVersion(1);
        quotation.setBillingType(request.getBillingType());
        quotation.setStatus(QuotationStatus.DRAFT);
        quotation.setQuotationDate(request.getQuotationDate() != null ? request.getQuotationDate() : LocalDate.now());
        quotation.setValidUntil(request.getValidUntil());
        quotation.setCreatedBy(getCurrentUsername());

        // Snapshot customer details
        quotation.setCustomerName(customer.getName());
        quotation.setCustomerMobile(customer.getMobile());
        quotation.setCustomerAddress(customer.getAddress());
        quotation.setCustomerGstin(customer.getGstin());
        quotation.setCustomerState(customer.getState() != null ? customer.getState() : request.getCustomerState());

        // Process items and calculate amounts
        List<QuotationItem> items = new ArrayList<>();
        double subtotal = 0.0;

        for (int i = 0; i < request.getItems().size(); i++) {
            QuotationItemDto itemDto = request.getItems().get(i);
            
            // Use area provided by frontend (already in feet) or calculate from height*width if not provided
            double area = itemDto.getArea() != null ? itemDto.getArea() : (itemDto.getHeight() * itemDto.getWidth());
            
            // Calculate item subtotal using area in feet (rate is per SqFt)
            double itemSubtotal = area * itemDto.getRatePerSqft() * itemDto.getQuantity();
            subtotal += itemSubtotal;

            QuotationItem item = new QuotationItem();
            item.setQuotation(quotation);
            item.setGlassType(itemDto.getGlassType());
            item.setThickness(itemDto.getThickness());
            item.setHeight(itemDto.getHeight());
            item.setWidth(itemDto.getWidth());
            item.setHeightUnit(itemDto.getHeightUnit() != null ? itemDto.getHeightUnit() : "FEET");
            item.setWidthUnit(itemDto.getWidthUnit() != null ? itemDto.getWidthUnit() : "FEET");
            item.setDesign(itemDto.getDesign());
            item.setQuantity(itemDto.getQuantity());
            item.setRatePerSqft(itemDto.getRatePerSqft());
            item.setArea(itemDto.getArea() != null ? itemDto.getArea() : area); // Use provided area (in feet) or calculate
            item.setSubtotal(itemSubtotal);
            item.setHsnCode(itemDto.getHsnCode());
            item.setDescription(itemDto.getDescription());
            item.setItemOrder(i);
            
            items.add(item);
        }

        quotation.setItems(items);
        quotation.setSubtotal(subtotal);
        quotation.setInstallationCharge(request.getInstallationCharge() != null ? request.getInstallationCharge() : 0.0);
        quotation.setTransportCharge(request.getTransportCharge() != null ? request.getTransportCharge() : 0.0);
        quotation.setTransportationRequired(request.getTransportationRequired() != null ? request.getTransportationRequired() : false);
        quotation.setDiscount(request.getDiscount() != null ? request.getDiscount() : 0.0);

        // Calculate GST and grand total
        calculateGstAndGrandTotal(quotation, request.getBillingType(), request.getGstPercentage(), request.getCustomerState(), shop);

        Quotation saved = quotationRepository.save(quotation);
        return convertToResponse(saved);
    }

    private void calculateGstAndGrandTotal(Quotation quotation, BillingType billingType, Double gstPercentage, String customerState, Shop shop) {
        double subtotal = quotation.getSubtotal() 
                + (quotation.getInstallationCharge() != null ? quotation.getInstallationCharge() : 0.0)
                + (quotation.getTransportCharge() != null ? quotation.getTransportCharge() : 0.0)
                - (quotation.getDiscount() != null ? quotation.getDiscount() : 0.0);

        if (billingType == BillingType.GST) {
            // GST calculation
            double gstAmount = subtotal * gstPercentage / 100.0;
            quotation.setGstPercentage(gstPercentage);
            quotation.setGstAmount(gstAmount);

            // Determine intra-state vs inter-state
            // For simplicity, we'll use shop state from shop entity (you may need to add shop state field)
            // For now, assuming intra-state (CGST + SGST)
            // You can enhance this by comparing shop state with customer state
            boolean isIntraState = true; // TODO: Compare shop state with customer state
            
            if (isIntraState) {
                // Intra-state: CGST + SGST (each 50% of GST)
                quotation.setCgst(gstAmount / 2.0);
                quotation.setSgst(gstAmount / 2.0);
                quotation.setIgst(0.0);
            } else {
                // Inter-state: IGST
                quotation.setCgst(0.0);
                quotation.setSgst(0.0);
                quotation.setIgst(gstAmount);
            }

            quotation.setGrandTotal(subtotal + gstAmount);
        } else {
            // Non-GST: No tax
            quotation.setGstPercentage(null);
            quotation.setGstAmount(0.0);
            quotation.setCgst(null);
            quotation.setSgst(null);
            quotation.setIgst(null);
            quotation.setGrandTotal(subtotal);
        }
    }

    public QuotationResponse getQuotationById(Long id) {
        Shop shop = getCurrentShop();
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));
        
        if (!quotation.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Quotation does not belong to your shop");
        }
        
        return convertToResponse(quotation);
    }

    public List<QuotationResponse> getAllQuotations() {
        Shop shop = getCurrentShop();
        return quotationRepository.findByShopOrderByCreatedAtDesc(shop)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public List<QuotationResponse> getQuotationsByStatus(QuotationStatus status) {
        Shop shop = getCurrentShop();
        return quotationRepository.findByShopAndStatus(shop, status)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public QuotationResponse confirmQuotation(Long id, ConfirmQuotationRequest request) {
        Shop shop = getCurrentShop();
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));
        
        if (!quotation.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Quotation does not belong to your shop");
        }

        if (quotation.getStatus() == QuotationStatus.CONFIRMED) {
            throw new RuntimeException("Quotation is already confirmed");
        }

        // Allow confirming DRAFT or SENT quotations
        if (quotation.getStatus() != QuotationStatus.DRAFT && quotation.getStatus() != QuotationStatus.SENT) {
            throw new RuntimeException("Only DRAFT or SENT quotations can be confirmed or rejected");
        }

        if (request.getAction() == QuotationStatus.CONFIRMED) {
            quotation.setStatus(QuotationStatus.CONFIRMED);
            quotation.setConfirmedAt(LocalDateTime.now());
            quotation.setConfirmedBy(getCurrentUsername());
            quotation.setRejectionReason(null);
        } else if (request.getAction() == QuotationStatus.REJECTED) {
            quotation.setStatus(QuotationStatus.REJECTED);
            quotation.setRejectionReason(request.getRejectionReason());
        } else {
            throw new RuntimeException("Invalid action. Use CONFIRMED or REJECTED");
        }

        Quotation saved = quotationRepository.save(quotation);
        return convertToResponse(saved);
    }

    @Transactional
    public QuotationResponse updateQuotation(Long id, CreateQuotationRequest request) {
        Shop shop = getCurrentShop();
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));
        
        if (!quotation.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Quotation does not belong to your shop");
        }

        if (quotation.getStatus() == QuotationStatus.CONFIRMED) {
            throw new RuntimeException("Cannot update confirmed quotation. Create a new version instead.");
        }

        // Prevent billing type change after creation
        if (!quotation.getBillingType().equals(request.getBillingType())) {
            throw new RuntimeException("Billing type cannot be changed after quotation creation");
        }

        // Update quotation (similar to create logic)
        // For brevity, reusing create logic - in production, you might want to refactor
        // This is a simplified update - you may want to create a new version instead
        
        return createQuotation(request); // For now, creating new quotation
        // TODO: Implement proper update logic or versioning
    }

    private QuotationResponse convertToResponse(Quotation quotation) {
        QuotationResponse response = new QuotationResponse();
        response.setId(quotation.getId());
        response.setCustomerId(quotation.getCustomer().getId());
        response.setQuotationNumber(quotation.getQuotationNumber());
        response.setVersion(quotation.getVersion());
        response.setBillingType(quotation.getBillingType());
        response.setStatus(quotation.getStatus());
        response.setCustomerName(quotation.getCustomerName());
        response.setCustomerMobile(quotation.getCustomerMobile());
        response.setCustomerAddress(quotation.getCustomerAddress());
        response.setCustomerGstin(quotation.getCustomerGstin());
        response.setCustomerState(quotation.getCustomerState());
        response.setQuotationDate(quotation.getQuotationDate());
        response.setValidUntil(quotation.getValidUntil());
        response.setSubtotal(quotation.getSubtotal());
        response.setInstallationCharge(quotation.getInstallationCharge());
        response.setTransportCharge(quotation.getTransportCharge());
        response.setTransportationRequired(quotation.getTransportationRequired());
        response.setDiscount(quotation.getDiscount());
        response.setGstPercentage(quotation.getGstPercentage());
        response.setCgst(quotation.getCgst());
        response.setSgst(quotation.getSgst());
        response.setIgst(quotation.getIgst());
        response.setGstAmount(quotation.getGstAmount());
        response.setGrandTotal(quotation.getGrandTotal());
        response.setConfirmedAt(quotation.getConfirmedAt());
        response.setConfirmedBy(quotation.getConfirmedBy());
        response.setRejectionReason(quotation.getRejectionReason());
        response.setCreatedBy(quotation.getCreatedBy());
        response.setCreatedAt(quotation.getCreatedAt());
        response.setUpdatedAt(quotation.getUpdatedAt());

        // Convert items
        List<QuotationItemDto> itemDtos = quotation.getItems().stream()
                .map(this::convertItemToDto)
                .collect(Collectors.toList());
        response.setItems(itemDtos);

        return response;
    }

    @Transactional
    public void deleteQuotation(Long id) {
        Shop shop = getCurrentShop();
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));
        
        if (!quotation.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Quotation does not belong to your shop");
        }

        // Prevent deletion of confirmed quotations that have been converted to invoices
        if (quotation.getStatus() == QuotationStatus.CONFIRMED) {
            // Check if quotation has been converted to invoice
            // You may want to add a check here if invoices reference quotations
            // For now, we'll allow deletion but warn the user
        }

        quotationRepository.delete(quotation);
    }

    private QuotationItemDto convertItemToDto(QuotationItem item) {
        QuotationItemDto dto = new QuotationItemDto();
        dto.setId(item.getId());
        dto.setGlassType(item.getGlassType());
        dto.setThickness(item.getThickness());
        dto.setHeight(item.getHeight());
        dto.setWidth(item.getWidth());
        dto.setHeightUnit(item.getHeightUnit() != null ? item.getHeightUnit() : "FEET");
        dto.setWidthUnit(item.getWidthUnit() != null ? item.getWidthUnit() : "FEET");
        dto.setDesign(item.getDesign());
        dto.setQuantity(item.getQuantity());
        dto.setRatePerSqft(item.getRatePerSqft());
        dto.setArea(item.getArea());
        dto.setSubtotal(item.getSubtotal());
        dto.setHsnCode(item.getHsnCode());
        dto.setDescription(item.getDescription());
        dto.setItemOrder(item.getItemOrder());
        return dto;
    }
}

