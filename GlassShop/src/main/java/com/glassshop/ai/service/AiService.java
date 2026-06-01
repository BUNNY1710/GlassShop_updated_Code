package com.glassshop.ai.service;

import org.springframework.stereotype.Service;

@Service
public class AiService {

	public String askAI(String question, String data) {

        question = question.toLowerCase();

        if (question.contains("low stock")) {
            return "Some glass items are low in stock. Please reorder soon.";
        }

        if (question.contains("installed")) {
            return "Installed glass details are available in installation records.";
        }

        if (question.contains("over stock")) {
            return "You have excess stock for some glass types.";
        }

        return "Sorry, I could not understand your question.";
    }
}
