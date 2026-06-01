package com.glassshop.ai.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.glassshop.ai.repository.InstallationRepository;

@Service
public class PredictionService {

	private final InstallationRepository installationRepository;

    public PredictionService(InstallationRepository installationRepository) {
        this.installationRepository = installationRepository;
    }

    public String predictFutureDemand() {

        List<Object[]> usageData =
                installationRepository.findGlassUsageLast3Months();

        if (usageData.isEmpty()) {
            return "No installation data available for prediction.";
        }
        for (Object[] row : usageData) {
            Long glassId = ((Number) row[0]).longValue();
            Long totalUsed = ((Number) row[1]).longValue();

            if (totalUsed > 100) {
                return "High future demand expected for glass ID: " + glassId;
            }
        }

        return "Demand looks stable for all glass types.";
    }
}
