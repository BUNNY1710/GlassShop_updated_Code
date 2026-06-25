import api from "./api";

// Customer APIs
export const getCustomers = () => api.get("/api/customers");
export const getCustomerById = (id) => api.get(`/api/customers/${id}`);
export const createCustomer = (data) => api.post("/api/customers", data);
export const updateCustomer = (id, data) => api.put(`/api/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/api/customers/${id}`);
export const searchCustomers = (query) => api.get(`/api/customers/search?query=${query}`);

// Quotation APIs
export const getQuotations = () => api.get("/api/quotations");
export const getQuotationById = (id) => api.get(`/api/quotations/${id}`);
export const createQuotation = (data) => api.post("/api/quotations", data);
export const confirmQuotation = (id, data) => api.put(`/api/quotations/${id}/confirm`, data);
export const deleteQuotation = (id) => api.delete(`/api/quotations/${id}`);

export const downloadQuotationPdf = (id) => {
  return api.get(`/api/quotations/${id}/download`, {
    responseType: 'blob',
  });
};

export const printCuttingPad = (id) => {
  return api.get(`/api/quotations/${id}/print-cutting-pad`, {
    responseType: 'blob',
  });
};

export const downloadTransportChallan = (invoiceId) => {
  return api.get(`/api/invoices/${invoiceId}/download-challan`, {
    responseType: 'blob',
  });
};

export const printDeliveryChallan = (invoiceId) => {
  return api.get(`/api/invoices/${invoiceId}/print-challan`, {
    responseType: 'blob',
  });
};

export const downloadInvoice = (invoiceId) => {
  return api.get(`/api/invoices/${invoiceId}/download-invoice`, {
    responseType: 'blob',
  });
};

export const downloadBasicInvoice = (invoiceId) => {
  return api.get(`/api/invoices/${invoiceId}/download-basic-invoice`, {
    responseType: 'blob',
  });
};

export const printInvoice = (invoiceId) => {
  return api.get(`/api/invoices/${invoiceId}/print-invoice`, {
    responseType: 'blob',
  });
};

// Per-item stickers for an invoice (one 100×150mm sticker per glass item).
export const printInvoiceStickers = (invoiceId) => {
  return api.get(`/api/invoices/${invoiceId}/print-stickers`, {
    responseType: 'blob',
  });
};

export const printBasicInvoice = (invoiceId) => {
  return api.get(`/api/invoices/${invoiceId}/print-basic-invoice`, {
    responseType: 'blob',
  });
};

export const getQuotationsByStatus = (status) => api.get(`/api/quotations/status/${status}`);

// Invoice APIs
export const getInvoices = () => api.get("/api/invoices");
export const getInvoiceById = (id) => api.get(`/api/invoices/${id}`);
export const createInvoiceFromQuotation = (data) => api.post("/api/invoices/from-quotation", data);
export const getInvoicesByPaymentStatus = (status) => api.get(`/api/invoices/payment-status/${status}`);
export const addPayment = (invoiceId, data) => api.post(`/api/invoices/${invoiceId}/payments`, data);

// Stock APIs (for glass type selection)
export const getAllStock = () => api.get("/api/stock/all");

// Architect APIs
export const getArchitects = () => api.get("/api/architects");
export const getArchitectById = (id) => api.get(`/api/architects/${id}`);
export const createArchitect = (data) => api.post("/api/architects", data);
export const updateArchitect = (id, data) => api.put(`/api/architects/${id}`, data);
export const deleteArchitect = (id) => api.delete(`/api/architects/${id}`);
export const searchArchitects    = (query)       => api.get(`/api/architects/search?query=${encodeURIComponent(query)}`);
export const getArchitectQuotations = (id, params) => api.get(`/api/architects/${id}/quotations`, { params });
export const getArchitectOrders     = (id, params) => api.get(`/api/architects/${id}/orders`,     { params });

