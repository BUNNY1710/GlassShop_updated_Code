package com.glassshop.ai.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.glassshop.ai.entity.Shop;

public interface ShopRepository extends JpaRepository<Shop, Long> {

}
