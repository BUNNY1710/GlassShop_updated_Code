# GlassShop Backend - Node.js

This is the Node.js/Express backend for the GlassShop application, converted from Spring Boot.

## Features

- **Authentication**: JWT-based authentication with role-based access control (ADMIN, STAFF)
- **Database**: PostgreSQL with Sequelize ORM
- **RESTful API**: Complete API endpoints for all business operations
- **Security**: Password hashing with bcrypt, JWT token validation

## Tech Stack

- Node.js
- Express.js
- Sequelize ORM
- PostgreSQL
- JWT (jsonwebtoken)
- bcryptjs

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=glass_shop
DB_USERNAME=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secret_key
JWT_EXPIRATION=24h

PORT=8080
CORS_ORIGIN=http://localhost:3000
```

4. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication (`/auth`)
- `POST /auth/register-shop` - Register a new shop (Public)
- `POST /auth/login` - Login (Public)
- `POST /auth/create-staff` - Create staff user (Admin only)
- `GET /auth/profile` - Get user profile (Authenticated)
- `POST /auth/change-password` - Change password (Authenticated)
- `GET /auth/staff` - Get staff list (Admin only)
- `DELETE /auth/staff/:id` - Delete staff (Admin only)

### Stock Management (`/stock`)
- `GET /stock/all` - Get all stock (Staff/Admin)
- `GET /stock/recent` - Get recent stock activity (Staff/Admin)
- `POST /stock/update` - Add/Remove stock (Staff/Admin)
- `POST /stock/transfer` - Transfer stock between stands (Staff/Admin)
- `GET /stock/alert/low` - Get low stock alerts (Staff/Admin)

### Customers (`/api/customers`)
- `POST /api/customers` - Create customer (Admin only)
- `GET /api/customers` - Get all customers (Admin only)
- `GET /api/customers/:id` - Get customer by ID (Admin only)
- `PUT /api/customers/:id` - Update customer (Admin only)
- `GET /api/customers/search?query=...` - Search customers (Admin only)
- `DELETE /api/customers/:id` - Delete customer (Admin only)

### Quotations (`/api/quotations`)
- `POST /api/quotations` - Create quotation (Admin only)
- `GET /api/quotations` - Get all quotations (Admin only)
- `GET /api/quotations/:id` - Get quotation by ID (Admin only)
- `GET /api/quotations/status/:status` - Get quotations by status (Admin only)
- `PUT /api/quotations/:id/confirm` - Confirm/Reject quotation (Admin only)
- `DELETE /api/quotations/:id` - Delete quotation (Admin only)

### Invoices (`/api/invoices`)
- `POST /api/invoices/from-quotation` - Create invoice from quotation (Admin only)
- `GET /api/invoices` - Get all invoices (Admin only)
- `GET /api/invoices/:id` - Get invoice by ID (Admin only)
- `GET /api/invoices/payment-status/:status` - Get invoices by payment status (Admin only)
- `POST /api/invoices/:id/payments` - Add payment to invoice (Admin only)

### Audit Logs (`/audit`)
- `GET /audit/recent` - Get recent audit logs (Admin only)
- `GET /audit/transfer-count` - Get transfer count (Staff/Admin)

### AI (`/ai`)
- `GET /ai/ping` - Health check (Admin only)
- `GET /ai/stock/advice?question=...` - Get stock advice (Admin only)
- `POST /ai/ask` - Ask AI questions (Admin only)

## Database Models

All models are defined in the `models/` directory:
- Shop
- User
- Glass
- Stock
- StockHistory
- Customer
- Quotation
- QuotationItem
- Invoice
- InvoiceItem
- Payment
- AuditLog
- Installation
- Site

## Security

- JWT tokens are required for all protected endpoints
- Passwords are hashed using bcrypt
- Role-based access control (RBAC) implemented
- CORS configured for frontend origin

## PDF Generation

The backend includes full PDF generation support:
- **Quotation PDFs**: Generate quotation/cutting-pad PDFs with all details
- **Invoice PDFs**: Generate full invoices with shop details (TAX INVOICE/BILL)
- **Basic Invoice PDFs**: Generate invoices without shop details
- **Challan PDFs**: Generate delivery challans with dimensions only (no prices)

All PDF endpoints support both download and print modes.

## Database Migrations

If you encounter errors about missing columns (e.g., `discount_type`, `discount_value`), run the migration script:

```bash
# Option 1: Run the Node.js migration script
node scripts/add-discount-columns.js

# Option 2: Run the SQL migration directly
psql -U postgres -d shop_class -f migrations/add_discount_fields.sql
```

## Notes

- Some AI features are simplified and may need full implementation
- Database migrations should be set up for production deployments
- If you add new fields to models, create corresponding migration scripts

## Converting from Spring Boot

This backend maintains the same API structure and endpoints as the original Spring Boot application, ensuring compatibility with the existing React frontend.

## License

ISC
