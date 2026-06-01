package com.glassshop.ai.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.glassshop.ai.entity.Installation;

@Repository
public interface InstallationRepository extends JpaRepository<Installation, Long> {

	List<Installation> findBySite_ClientName(String clientName);
	
	 @Query(value = """
		        SELECT glass_id, SUM(quantity) AS total_used
		        FROM installation
		        WHERE install_date >= CURRENT_DATE - INTERVAL '3 MONTH'
		        GROUP BY glass_id
		        """, nativeQuery = true)
		    List<Object[]> findGlassUsageLast3Months();
	
}
