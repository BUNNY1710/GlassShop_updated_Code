package com.glassshop.ai.service;

import org.springframework.stereotype.Service;

import com.glassshop.ai.enums.IntentType;

@Service
public class IntentService {
	
	public IntentType detectIntent(String question) {

        if (question == null) {
            return IntentType.UNKNOWN;
        }

        question = question.toLowerCase();

        // LOW STOCK
        if (
            question.contains("low") &&
            (question.contains("stock") || question.contains("glass"))
        ) {
            return IntentType.LOW_STOCK;
        }
        
        if (
                question.contains("installed") ||
                question.contains("installation")
            ) {
                return IntentType.INSTALLED_GLASS;
            }

            // OVER STOCK
            if (
                question.contains("over") ||
                question.contains("excess")
            ) {
                return IntentType.OVER_STOCK;
            }
            
            if (
                    question.contains("predict") ||
                    question.contains("future") ||
                    question.contains("next month")
                ) {
                    return IntentType.PREDICTION;
                }

                return IntentType.UNKNOWN;
            }
}
