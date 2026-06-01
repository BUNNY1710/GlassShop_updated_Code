package com.glassshop.ai.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.glassshop.ai.entity.Invoice;
import com.glassshop.ai.entity.Payment;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByInvoice(Invoice invoice);
    List<Payment> findByInvoiceOrderByPaymentDateDesc(Invoice invoice);
    void deleteByInvoice(Invoice invoice);
}

