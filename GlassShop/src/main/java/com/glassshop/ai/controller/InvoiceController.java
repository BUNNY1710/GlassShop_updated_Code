package com.glassshop.ai.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.glassshop.ai.dto.AddPaymentRequest;
import com.glassshop.ai.dto.CreateInvoiceRequest;
import com.glassshop.ai.dto.InvoiceResponse;
import com.glassshop.ai.dto.PaymentDto;
import com.glassshop.ai.enums.PaymentStatus;
import com.glassshop.ai.service.InvoiceService;
import com.glassshop.ai.service.PdfService;

import jakarta.validation.Valid;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/invoices")
@PreAuthorize("hasRole('ADMIN')")
public class InvoiceController {

    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private PdfService pdfService;

    @PostMapping("/from-quotation")
    public ResponseEntity<InvoiceResponse> createInvoiceFromQuotation(@Valid @RequestBody CreateInvoiceRequest request) {
        try {
            InvoiceResponse invoice = invoiceService.createInvoiceFromQuotation(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(invoice);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<InvoiceResponse>> getAllInvoices() {
        try {
            List<InvoiceResponse> invoices = invoiceService.getAllInvoices();
            return ResponseEntity.ok(invoices);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/payment-status/{status}")
    public ResponseEntity<List<InvoiceResponse>> getInvoicesByPaymentStatus(@PathVariable PaymentStatus status) {
        try {
            List<InvoiceResponse> invoices = invoiceService.getInvoicesByPaymentStatus(status);
            return ResponseEntity.ok(invoices);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // More specific routes should come before generic /{id} route
    @GetMapping("/{id}/download-invoice")
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable Long id) {
        try {
            byte[] pdfBytes = pdfService.generateInvoicePdf(id);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "invoice-" + id + ".pdf");
            return ResponseEntity.ok().headers(headers).body(pdfBytes);
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/download-basic-invoice")
    public ResponseEntity<byte[]> downloadBasicInvoice(@PathVariable Long id) {
        try {
            byte[] pdfBytes = pdfService.generateBasicInvoicePdf(id);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "basic-invoice-" + id + ".pdf");
            return ResponseEntity.ok().headers(headers).body(pdfBytes);
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/print-invoice")
    public ResponseEntity<byte[]> printInvoice(@PathVariable Long id) {
        try {
            byte[] pdfBytes = pdfService.generateInvoicePdf(id);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "invoice-" + id + ".pdf");
            return ResponseEntity.ok().headers(headers).body(pdfBytes);
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/print-basic-invoice")
    public ResponseEntity<byte[]> printBasicInvoice(@PathVariable Long id) {
        try {
            byte[] pdfBytes = pdfService.generateBasicInvoicePdf(id);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "basic-invoice-" + id + ".pdf");
            return ResponseEntity.ok().headers(headers).body(pdfBytes);
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/download-challan")
    public ResponseEntity<byte[]> downloadTransportChallan(@PathVariable Long id) {
        try {
            byte[] pdfBytes = pdfService.generateTransportChallanPdf(id);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "delivery-challan-" + id + ".pdf");
            return ResponseEntity.ok().headers(headers).body(pdfBytes);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/print-challan")
    public ResponseEntity<byte[]> printDeliveryChallan(@PathVariable Long id) {
        try {
            byte[] pdfBytes = pdfService.generateDeliveryChallanPrintPdf(id);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "delivery-challan-print-" + id + ".pdf");
            return ResponseEntity.ok().headers(headers).body(pdfBytes);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{id}/payments")
    public ResponseEntity<PaymentDto> addPayment(
            @PathVariable Long id,
            @Valid @RequestBody AddPaymentRequest request) {
        try {
            PaymentDto payment = invoiceService.addPayment(id, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(payment);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponse> getInvoiceById(@PathVariable Long id) {
        try {
            InvoiceResponse invoice = invoiceService.getInvoiceById(id);
            return ResponseEntity.ok(invoice);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

