# GlassShop Backend — Node.js / Express / Sequelize

REST API for the GlassShop glass inventory management system.

---

## Quick Setup (5 steps)

```
1. Install Node.js 18+
2. Install PostgreSQL 14+
3. Create an empty database
4. Copy .env.example → .env and fill in your credentials
5. npm install && npm run dev
```

Everything else — table creation, schema migration, admin user seed — happens
automatically on first startup.

---

## Detailed Setup

### 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| PostgreSQL | ≥ 14 | [postgresql.org](https://www.postgresql.org) |
| npm | ≥ 9 | Bundled with Node.js |

### 2. Create the database

```sql
-- run in psql or any PostgreSQL client
CREATE DATABASE glass_shop;
```

> The server will **auto-create** the database if the PostgreSQL user
> has `CREATEDB` privilege.  If you create it manually this step is skipped.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=glass_shop
DB_USERNAME=postgres
DB_PASSWORD=your_password_here

JWT_SECRET=change_this_to_something_long_and_random
PORT=8080
NODE_ENV=development
```

### 4. Install dependencies

```bash
npm install
```

### 5. Start the server

```bash
npm run dev        # development (auto-reload via nodemon)
npm start          # production
```

---

## What happens on startup

```
Backend Start
    │
    ├─► 1. Connect to postgres maintenance DB
    │       ├─ If target DB exists    → continue
    │       └─ If target DB missing   → CREATE DATABASE glass_shop
    │
    ├─► 2. Verify Sequelize connection to glass_shop
    │
    ├─► 3. Run SQL migrations  (migrations/*.sql, alphabetical order)
    │       ├─ Tracks applied migrations in _schema_migrations table
    │       ├─ Skips already-applied migrations
    │       └─ Logs each migration result
    │
    ├─► 4. Sequelize sync  (alter: true)
    │       ├─ Creates tables that don't exist yet
    │       ├─ Adds columns that models define but DB lacks
    │       └─ Never drops columns or tables
    │
    ├─► 5. Seeder
    │       ├─ Creates default shop  ("GlassShop Demo")
    │       ├─ Creates admin user    (admin / admin123)
    │       └─ Dev mode: creates sample Architect, Customer, Stock
    │
    └─► 6. HTTP server starts on PORT 8080
```

---

## Default credentials

| | |
|---|---|
| **URL** | http://localhost:8080 |
| **Username** | admin |
| **Password** | admin123 |

**Change the password immediately after your first login.**

---

## Sample data (development)

In `NODE_ENV=development` the seeder creates:

- One **Architect**: Sample Architect (Mumbai)
- One **Customer**: Sample Customer (references the architect)
- One **Glass**: Plan 5 MM
- One **Stock** entry: Stand 1, Qty 10, ₹80 purchase / ₹120 selling
- One **GlassPriceMaster** entry: Plan 5 MM

To force sample data in production: set `SEED_SAMPLE_DATA=true` in `.env`.

---

## Database schema

All 16 tables are created automatically from Sequelize models.

| Table | Model |
|-------|-------|
| `shop` | Shop |
| `users` | User |
| `architects` | Architect |
| `customers` | Customer |
| `glass` | Glass |
| `stock` | Stock |
| `stock_history` | StockHistory |
| `quotations` | Quotation |
| `quotation_items` | QuotationItem |
| `invoices` | Invoice |
| `invoice_items` | InvoiceItem |
| `payments` | Payment |
| `audit_log` | AuditLog |
| `glass_price_master` | GlassPriceMaster |
| `sites` | Site |
| `installations` | Installation |
| `_schema_migrations` | *(migration tracker)* |

---

## Migrations

SQL migration files live in `migrations/`.  They run in alphabetical order
before the Sequelize sync and are tracked in `_schema_migrations`.

| File | Purpose |
|------|---------|
| `add_discount_fields.sql` | Adds discount_type, discount_value to quotations |
| `add_price_fields.sql` | Adds purchase_price, selling_price to stock |
| `add_shipping_address.sql` | Adds shipping_address to quotations + invoices |
| `create_glass_price_master.sql` | Creates glass_price_master table |
| `m001_quotation_item_prices.sql` | Adds selling_price, purchase_price to quotation_items |
| `m002_glass_thickness_decimal.sql` | Changes glass.thickness INTEGER → DECIMAL(10,2) |

To add a new migration: create `migrations/mXXX_description.sql`.
The runner picks it up automatically on next startup.

---

## API endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register-shop` | Register a new shop + admin |
| POST | `/api/auth/login` | Login, returns JWT |

### Protected (Bearer token required)
| Prefix | Role | Description |
|--------|------|-------------|
| `/api/stock` | Staff + Admin | Stock management |
| `/api/customers` | Admin | Customer CRUD |
| `/api/architects` | Admin | Architect CRUD |
| `/api/quotations` | Admin (write), All (read) | Quotation management |
| `/api/invoices` | Admin | Invoice + payment management |
| `/api/audit` | Admin | Audit log |
| `/api/glass-price-master` | Admin | Price catalog |
| `/api/ai` | Admin | AI assistant (stub) |

### Diagnostic
| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | None |
| GET | `/test` | None |

---

## Scripts

```bash
npm run dev           # nodemon dev server
npm start             # production server
npm test              # Jest tests
```

---

## Environment variables

| Variable | Default | Required |
|----------|---------|----------|
| `DB_HOST` | localhost | no |
| `DB_PORT` | 5432 | no |
| `DB_NAME` | glass_shop | no |
| `DB_USERNAME` | postgres | **yes** |
| `DB_PASSWORD` | *(empty)* | **yes** |
| `JWT_SECRET` | *(none)* | **yes** |
| `PORT` | 8080 | no |
| `NODE_ENV` | development | no |
| `EC2_IP` | 16.16.73.29 | production only |
| `SEED_SAMPLE_DATA` | false | no |
