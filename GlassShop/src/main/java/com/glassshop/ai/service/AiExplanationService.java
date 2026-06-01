package com.glassshop.ai.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.glassshop.ai.entity.Stock;
import com.glassshop.ai.repository.StockRepository;

@Service
public class AiExplanationService {

    @Autowired
    private StockRepository stockRepository;

    public String explainLowStock() {

        List<Stock> lowStocks = stockRepository.findLowStock();

        if (lowStocks.isEmpty()) {
            return "✅ All glass stock levels are healthy. No action required.";
        }

        StringBuilder explanation = new StringBuilder();

        for (Stock s : lowStocks) {
            if (s.getGlass() == null) continue;

            int reorderQty =
                (s.getMinQuantity() * 3) - s.getQuantity();

            explanation.append("🧠 AI Insight:\n")
                       .append("The stock of ")
                       .append(s.getGlass().getType())
                       .append(" glass at stand ")
                       .append(s.getStandNo())
                       .append(" is running low.\n")
                       .append("Only ")
                       .append(s.getQuantity())
                       .append(" units are available, ")
                       .append("while the minimum required is ")
                       .append(s.getMinQuantity())
                       .append(".\n")
                       .append("To prevent shortages, ")
                       .append("it is recommended to reorder ")
                       .append(reorderQty)
                       .append(" units.\n\n");
        }

        return explanation.toString();
    }
}
