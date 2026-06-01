package com.glassshop.ai.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.glassshop.ai.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {

	Optional<User> findByUserName(String username);
	List<User> findByShopIdAndRole(Long shopId, String role);

}
