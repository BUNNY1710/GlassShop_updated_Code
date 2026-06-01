package com.glassshop.ai.controller;

import java.io.IOException;
import java.util.List;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.glassshop.ai.dto.StockActivityDto;
import com.glassshop.ai.dto.StockTransferRequest;
import com.glassshop.ai.dto.StockUpdateRequest;
import com.glassshop.ai.entity.Stock;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.StockRepository;
import com.glassshop.ai.repository.UserRepository;
import com.glassshop.ai.service.AiExplanationService;
import com.glassshop.ai.service.AlertService;
import com.glassshop.ai.service.ReorderService;
import com.glassshop.ai.service.StockService;

import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/stock")
@CrossOrigin(origins = "http://localhost:3000")
public class StockController {
	
	 	@Autowired
	    private StockService stockService;
	 	
	 	@Autowired
	 	private AlertService alertService;
	 	
	 	@Autowired
	 	private ReorderService reorderService;
	 	
	 	@Autowired
	 	private AiExplanationService aiExplanationService;
	 	
	 	@Autowired
	 	private UserRepository userRepository;
	 	
	 	@Autowired
	 	private StockRepository stockRepository;

	 	@GetMapping("/ai/explain")
	 	public String aiExplanation() {
	 	    return aiExplanationService.explainLowStock();
	 	}

	 	@GetMapping("/reorder/suggest")
	 	public String reorderSuggestion() {
	 	    return reorderService.getReorderSuggestions();
	 	}

	 	@GetMapping("/alert/low")
	 	public String lowStockAlert() {
	 	    return alertService.checkLowStockOnly();
	 	}

	    @PostMapping("/update")
	    public String updateStock(
	            @RequestBody StockUpdateRequest request) {
	        return stockService.updateStock(request);
	    }
	    
	    @GetMapping("/all")
	    public List<Stock> getAllStock() {
	        return stockService.getAllStock();
	    }
	    
	    @PostMapping("/undo")
	    public String undoLastAction() {
	        return stockService.undoLastAction();
	    }

	 // StockController.java
	    @GetMapping("/recent")
	    public List<StockActivityDto> recentStockActivity() {
	        return stockService.getRecentStockActivity(3);
	    }
	    
//	    @PostMapping("/transfer")
//	    public ResponseEntity<String> transferStock(
//	            @RequestBody StockTransferRequest request) {
//	        return ResponseEntity.ok(stockService.transferStock(request));
//	    }

	    
//	    @GetMapping("/stock/download")
//	    public void downloadStock(HttpServletResponse response) throws IOException {
//
//	        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
//	        User user = userRepository.findByUserName(auth.getName()).orElseThrow();
//
//	        List<Stock> stocks = stockRepository.findByShop(user.getShop());
//
//	        response.setContentType("text/csv");
//	        response.setHeader(
//	                "Content-Disposition",
//	                "attachment; filename=stock-report.csv"
//	        );
//
//	        CSVPrinter csvPrinter = new CSVPrinter(
//	                response.getWriter(),
//	                CSVFormat.DEFAULT.withHeader(
//	                        "Glass Type",
//	                        "Quantity",
//	                        "Min Quantity",
//	                        "Stand No"
//	                )
//	        );
//
//	        for (Stock stock : stocks) {
//	            csvPrinter.printRecord(
//	                    stock.getGlass().getGlassType(),
//	                    stock.getQuantity(),
//	                    stock.getMinQuantity(),
//	                    stock.getStandNo()
//	            );
//	        }
//
//	        csvPrinter.flush();
//	    }
//
//


}
