package com.glassshop.ai.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.glassshop.ai.entity.Quotation;
import com.glassshop.ai.entity.QuotationItem;

@Repository
public interface QuotationItemRepository extends JpaRepository<QuotationItem, Long> {
    List<QuotationItem> findByQuotation(Quotation quotation);
    List<QuotationItem> findByQuotationOrderByItemOrderAsc(Quotation quotation);
    void deleteByQuotation(Quotation quotation);
}

