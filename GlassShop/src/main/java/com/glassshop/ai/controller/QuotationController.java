package com.glassshop.ai.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.glassshop.ai.dto.ConfirmQuotationRequest;
import com.glassshop.ai.dto.CreateQuotationRequest;
import com.glassshop.ai.dto.QuotationResponse;
import com.glassshop.ai.enums.QuotationStatus;
import com.glassshop.ai.service.QuotationService;
import com.glassshop.ai.service.PdfService;

import jakarta.validation.Valid;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/quotations")
@PreAuthorize("hasRole('ADMIN')")
public class QuotationController {

    @Autowired
    private QuotationService quotationService;

    @Autowired
    private PdfService pdfService;

    @PostMapping
    public ResponseEntity<QuotationResponse> createQuotation(@Valid @RequestBody CreateQuotationRequest request) {
        try {
            QuotationResponse quotation = quotationService.createQuotation(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(quotation);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<QuotationResponse>> getAllQuotations() {
        try {
            List<QuotationResponse> quotations = quotationService.getAllQuotations();
            return ResponseEntity.ok(quotations);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuotationResponse> getQuotationById(@PathVariable Long id) {
        try {
            QuotationResponse quotation = quotationService.getQuotationById(id);
            return ResponseEntity.ok(quotation);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<QuotationResponse>> getQuotationsByStatus(@PathVariable QuotationStatus status) {
        try {
            List<QuotationResponse> quotations = quotationService.getQuotationsByStatus(status);
            return ResponseEntity.ok(quotations);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}/confirm")
    public ResponseEntity<QuotationResponse> confirmQuotation(
            @PathVariable Long id,
            @RequestBody ConfirmQuotationRequest request) {
        try {
            QuotationResponse quotation = quotationService.confirmQuotation(id, request);
            return ResponseEntity.ok(quotation);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuotation(@PathVariable Long id) {
        try {
            quotationService.deleteQuotation(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadQuotationPdf(@PathVariable Long id) {
        try {
            byte[] pdfBytes = pdfService.generateQuotationPdf(id);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "quotation-" + id + ".pdf");
            return ResponseEntity.ok().headers(headers).body(pdfBytes);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/print-cutting-pad")
    public ResponseEntity<byte[]> printCuttingPad(@PathVariable Long id) {
        try {
            byte[] pdfBytes = pdfService.generateCuttingPadPrintPdf(id);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "cutting-pad-" + id + ".pdf");
            return ResponseEntity.ok().headers(headers).body(pdfBytes);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

