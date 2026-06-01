package com.glassshop.ai.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.glassshop.ai.entity.Glass;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.Stock;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {

	@Query("""
		    SELECT s FROM Stock s
		    WHERE s.quantity < s.minQuantity
		    """)
		    List<Stock> findLowStock();
	
	List<Stock> findByGlass_Type(String type);
	
	Optional<Stock> findByGlass_Id(Long glassId);
	
	List<Stock> findAll();
	@Query("""
		    SELECT s FROM Stock s
		    WHERE s.shop.id = :shopId
		      AND s.quantity < s.minQuantity
		""")
		List<Stock> findLowStockByShopId(Long shopId);

	List<Stock> findByShopId(Long shopId);
	List<Stock> findByShop(Shop shop);
	Optional<Stock> findByGlass_IdAndShop_Id(Long glassId, Long shopId);
	

	    List<Stock> findTop3ByShopOrderByUpdatedAtDesc(Shop shop);
	    Optional<Stock> findByGlassAndStandNoAndShop(
	    	    Glass glass,
	    	    int standNo,
	    	    Shop shop
	    	);
	    Optional<Stock> findByGlassAndHeightAndWidthAndStandNoAndShop(
	    	    Glass glass,
	    	    String height,
	    	    String width,
	    	    int standNo,
	    	    Shop shop
	    	);
	   



	


}
