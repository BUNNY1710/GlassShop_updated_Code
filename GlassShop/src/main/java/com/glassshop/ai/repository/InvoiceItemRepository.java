package com.glassshop.ai.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.glassshop.ai.entity.Invoice;
import com.glassshop.ai.entity.InvoiceItem;

@Repository
public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Long> {
    List<InvoiceItem> findByInvoice(Invoice invoice);
    List<InvoiceItem> findByInvoiceOrderByItemOrderAsc(Invoice invoice);
    void deleteByInvoice(Invoice invoice);
}

