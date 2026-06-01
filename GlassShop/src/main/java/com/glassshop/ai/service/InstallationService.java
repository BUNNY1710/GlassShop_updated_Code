package com.glassshop.ai.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.glassshop.ai.entity.Installation;
import com.glassshop.ai.repository.InstallationRepository;

@Service
public class InstallationService {

	@Autowired
    private InstallationRepository installationRepository;

    public String getInstalledGlassByClient(String clientName) {

        List<Installation> list = installationRepository.findBySite_ClientName(clientName);

        if (list.isEmpty()) {
            return "No installation found for " + clientName;
        }
        
        StringBuilder sb = new StringBuilder();
        for (Installation i : list) {
            sb.append("Glass: ")
              .append(i.getGlass().getType())
              .append(", Quantity: ")
              .append(i.getQuantity())
              .append(", Status: ")
              .append(i.getStatus())
              .append("\n");
        }
        return sb.toString();
    }
}
