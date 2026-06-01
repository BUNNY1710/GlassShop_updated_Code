package com.glassshop.ai.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.glassshop.ai.entity.Customer;
import com.glassshop.ai.entity.Shop;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByShop(Shop shop);
    List<Customer> findByShopOrderByNameAsc(Shop shop);
    Optional<Customer> findByMobileAndShop(String mobile, Shop shop);
    List<Customer> findByShopAndNameContainingIgnoreCase(Shop shop, String name);
}

