package com.glassshop.ai.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.glassshop.ai.entity.Stock;
import com.glassshop.ai.repository.StockRepository;

@Service
public class ReorderService {

    @Autowired
    private StockRepository stockRepository;

    public String getReorderSuggestions() {

        List<Stock> lowStocks = stockRepository.findLowStock();

        if (lowStocks.isEmpty()) {
            return "✅ No reorder needed. Stock levels are healthy.";
        }

        StringBuilder sb = new StringBuilder("📦 REORDER SUGGESTIONS\n\n");

        for (Stock s : lowStocks) {
            if (s.getGlass() == null) continue;

            int recommendedQty =
                    (s.getMinQuantity() * 3) - s.getQuantity();

            if (recommendedQty < 0) {
                recommendedQty = 0;
            }

            sb.append("Glass: ")
              .append(s.getGlass().getType())
              .append("\nStand: ")
              .append(s.getStandNo())
              .append("\nAvailable: ")
              .append(s.getQuantity())
              .append("\nMinimum: ")
              .append(s.getMinQuantity())
              .append("\n👉 Order: ")
              .append(recommendedQty)
              .append(" units\n\n");
        }

        return sb.toString();
    }
}
