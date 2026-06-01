package com.glassshop.ai.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.glassshop.ai.dto.StockTransferRequest;
import com.glassshop.ai.service.StockTransferService;

@RestController
@RequestMapping("/stock")
@CrossOrigin
public class StockTransferController {

    @Autowired
    private StockTransferService transferService;

    @PostMapping("/transfer")
    public String transfer(@RequestBody StockTransferRequest request) {
        return transferService.transferStock(request);
    }
}
