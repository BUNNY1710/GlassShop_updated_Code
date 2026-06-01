package com.glassshop.ai.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.glassshop.ai.entity.Customer;
import com.glassshop.ai.entity.Invoice;
import com.glassshop.ai.entity.Quotation;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.enums.BillingType;
import com.glassshop.ai.enums.InvoiceType;
import com.glassshop.ai.enums.PaymentStatus;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByShop(Shop shop);
    List<Invoice> findByShopOrderByCreatedAtDesc(Shop shop);
    List<Invoice> findByShopAndPaymentStatus(Shop shop, PaymentStatus paymentStatus);
    List<Invoice> findByShopAndBillingType(Shop shop, BillingType billingType);
    List<Invoice> findByShopAndInvoiceType(Shop shop, InvoiceType invoiceType);
    List<Invoice> findByCustomer(Customer customer);
    List<Invoice> findByQuotation(Quotation quotation);
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    Optional<Invoice> findByInvoiceNumberAndShop(String invoiceNumber, Shop shop);
    List<Invoice> findByShopAndCustomerOrderByCreatedAtDesc(Shop shop, Customer customer);
}

