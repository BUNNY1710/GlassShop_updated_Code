package com.glassshop.ai.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.glassshop.ai.dto.AiRequest;
import com.glassshop.ai.service.AiService;
import com.glassshop.ai.service.AiStockAdvisorService;
import com.glassshop.ai.service.InstallationService;
import com.glassshop.ai.service.PredictionService;
import com.glassshop.ai.service.StockService;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/ai")
public class AiController {

	    @Autowired
	    private StockService stockService;

	    @Autowired
	    private InstallationService installationService;

	    @Autowired
	    private AiService aiService;
	    
	    @Autowired
	    private PredictionService predictionService;
	    
	    @Autowired
	    private AiStockAdvisorService aiStockAdvisorService;
	    
	    @GetMapping("/ping")
	    public String ping() {
	        return "Spring Boot is working 👍";
	    }
	    
	    /**
	     * AI Stock Advisor endpoint
	     * Answers business questions using stock and audit data
	     * 
	     * Example questions:
	     * - "What should I reorder?"
	     * - "Which glass sells most?"
	     * - "Which glass is dead stock?"
	     * - "Which stand has frequent movement?"
	     * 
	     * @param question Natural language question
	     * @return Human-readable AI response
	     */
	    @GetMapping("/stock/advice")
	    public String getStockAdvice(@org.springframework.web.bind.annotation.RequestParam("question") String question) {
	        return aiStockAdvisorService.getAdvice(question);
	    }
	    
	    @PostMapping("/ask")
	    public String ask(@RequestBody AiRequest request) {

	        switch (request.getAction()) {

	            case "LOW_STOCK":
	                return stockService.getLowStockData();

	            case "AVAILABLE":
	                return stockService.getAvailableStock(
	                        request.getGlassType());

	            case "INSTALLED":
	                return installationService
	                        .getInstalledGlassByClient(
	                                request.getSite());

	            case "PREDICT":
	                return predictionService.predictFutureDemand();

	            default:
	                return "❌ Invalid option selected";
	        }
	    }

	    
//	    @PostMapping("/ask")
//	    public String ask(@RequestBody AiRequest request) {
//
//	    	String data;
//
//	        switch (request.getAction()) {
//
//	            case "LOW_STOCK":
//	                data = stockService.getLowStockData();
//	                break;
//
//	            case "AVAILABLE":
//	                data = stockService.getAvailableStock(
//	                        request.getGlassType());
//	                break;
//
//	            case "INSTALLED":
//	                data = installationService
//	                        .getInstalledGlassByClient(request.getSite());
//	                break;
//	                
//	            case "PREDICT":
//	                data = predictionService.predictFutureDemand();
//	                break;
//
//	            default:
//	                return "Invalid option selected";
//	        }
//
//	        return data;
//	    	
//	    }
	    
	    private String buildPrompt(AiRequest req) {
	        return "User wants " + req.getAction() +
	               " for glass type " + req.getGlassType() +
	               " at site " + req.getSite();
	    }

}
