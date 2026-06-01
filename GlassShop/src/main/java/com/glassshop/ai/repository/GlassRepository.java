package com.glassshop.ai.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.glassshop.ai.entity.Glass;

public interface GlassRepository extends JpaRepository<Glass, Long> {

	Glass findByType(String type);
//	
//	Optional<Glass> findByTypeAndThicknessAndHeightAndWidthAndUnit(
//		    String type,
//		    int thickness,
//		    String height,
//		    String width,
//		    String unit
//		);

	Optional<Glass> findByTypeAndThicknessAndUnit(
		    String type,
		    int thickness,
		    String unit
		);


}
