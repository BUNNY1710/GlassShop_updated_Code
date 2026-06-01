package com.glassshop.ai.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.glassshop.ai.entity.Customer;
import com.glassshop.ai.entity.Quotation;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.enums.BillingType;
import com.glassshop.ai.enums.QuotationStatus;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, Long> {
    List<Quotation> findByShop(Shop shop);
    List<Quotation> findByShopOrderByCreatedAtDesc(Shop shop);
    List<Quotation> findByShopAndStatus(Shop shop, QuotationStatus status);
    List<Quotation> findByShopAndBillingType(Shop shop, BillingType billingType);
    List<Quotation> findByCustomer(Customer customer);
    Optional<Quotation> findByQuotationNumber(String quotationNumber);
    Optional<Quotation> findByQuotationNumberAndShop(String quotationNumber, Shop shop);
    List<Quotation> findByShopAndCustomerOrderByCreatedAtDesc(Shop shop, Customer customer);
}

