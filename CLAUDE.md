# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a monorepo with two active sub-projects:

- `glassshop-backend/` — Node.js/Express REST API (port 8080)
- `glass-ai-agent-frontend/` — React SPA (port 3000)
- `GlassShop/` — Legacy Java Spring Boot app; not in active use

## Commands

### Backend (`glassshop-backend/`)

```bash
npm run dev       # Start with nodemon (auto-reload)
npm start         # Production start
npm test          # Run all Jest tests
npm test -- --testPathPattern=routes/stock   # Run a single test file
npm test -- --testNamePattern="low stock"    # Run tests matching a name
```

### Frontend (`glass-ai-agent-frontend/`)

```bash
npm start                  # Dev server on port 3000
npm run build              # Production build
npm test                   # Jest unit tests (watch mode)
npm run test:coverage      # Coverage report (non-watch)
npm run cypress:open       # Open Cypress UI
npm run test:e2e           # Run Cypress headlessly
```

### Root

```bash
npm run install:all     # Install deps for root + both sub-projects
npm run start:backend   # cd glassshop-backend && npm run dev
npm run start:frontend  # cd glass-ai-agent-frontend && npm start
npm run test:backend    # Run backend Jest tests
npm run test:frontend   # Run frontend Jest tests
```

Convenience: `start-all.bat` (Windows) / `start-all.sh` (Linux/Mac) at the repo root start both services in one command.

## Backend Environment

On first startup, if `glassshop-backend/.env` doesn't exist, `server.js` automatically copies `.env.example` → `.env`. You still need to set `DB_PASSWORD` — the server exits immediately with a clear error message if it's missing or empty (PostgreSQL 14+ uses SCRAM-SHA-256 which requires a password).

Create `glassshop-backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=glass_shop
DB_USERNAME=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
JWT_EXPIRATION=24h       # Optional; defaults to 24h
PORT=8080
NODE_ENV=development
EC2_IP=16.16.73.29       # Only needed in production; controls CORS origin default
```

On every startup the backend runs a 4-step initialization sequence (see `glassshop-backend/utils/dbInit.js`):
1. **Create DB** — if the target database doesn't exist, it's created automatically using a raw `pg` client connected to the `postgres` maintenance DB.
2. **Run migrations** — SQL files in `migrations/` are executed in alphabetical order. Applied migrations are tracked in `_schema_migrations` and skipped on subsequent startups.
3. **Sequelize sync** — `sequelize.sync({ alter: true })` adds any tables or columns that the models define but that don't yet exist. Falls back to `{ force: false }` (create-only) if alter fails.
4. **Seeder** — creates the default shop and admin user (`admin`/`admin123`) if they don't exist. In `NODE_ENV=development` also creates sample Architect, Customer, Glass, and Stock entries.

In production, the sync step still runs (alter:true) but migrations should also be applied via `deploy/migrations/*.sql` for any changes requiring explicit DDL (e.g. column type changes that PostgreSQL needs a USING clause for).

`glassshop-backend/migrations/` contains additional SQL migration files and `scripts/add-discount-columns.js` is a Node.js migration helper for cases where plain SQL isn't sufficient.

## Frontend Environment

Create `glass-ai-agent-frontend/.env` only when overriding defaults:

```env
REACT_APP_API_URL=http://localhost:8080
```

Without this variable, the frontend auto-detects: S3/CloudFront hostnames hit the EC2 IP (`16.16.73.29:8080`); everything else hits `localhost:8080`.

## Architecture

### Multi-tenancy

All business data is shop-scoped. Every User belongs to a Shop, and every query that returns or modifies business data filters by `shopId` (obtained by looking up the authenticated user in the DB). There is no global admin role that spans shops.

### Authentication Flow

1. Client POSTs to `/api/auth/login` → receives a JWT (24h expiry, configurable via `JWT_EXPIRATION`).
2. JWT payload: `{ sub: username, role: "ROLE_ADMIN" | "ROLE_STAFF" }`.
3. Token is stored in `sessionStorage` (not `localStorage`).
4. The axios instance in `glass-ai-agent-frontend/src/api/api.js` automatically attaches `Authorization: Bearer <token>` to every request and redirects to `/login` on 401.
5. Backend `authMiddleware` validates the JWT and attaches `{ username, role }` to `req.user`.

**Shop registration**: `POST /api/auth/register-shop` is public but the `Register.js` frontend component is entirely commented out — self-registration via the UI is disabled. New shops must be created by directly calling the API or via the seeder.

### Role-Based Access

- `ROLE_ADMIN` — full access including staff management, quotations, invoices, customers, AI assistant, audit log, and glass price master.
- `ROLE_STAFF` — limited to stock operations and staff-side quotations.
- Frontend enforces this in `App.js` via `<ProtectedRoute allowedRoles={[...]}>` and the `<RequireAdmin>` wrapper.
- Backend enforces it via `requireAdmin` / `requireStaff` middleware from `glassshop-backend/middleware/auth.js`.
- Important: `server.js` only applies `authMiddleware` at the route mount level. Each router then applies `requireAdmin` or `requireStaff` at the top of the router file via `router.use(...)`, not per-endpoint. `requireStaff` allows both ROLE_STAFF and ROLE_ADMIN; `requireAdmin` allows only ROLE_ADMIN.

### Backend Route Structure

Only `POST /api/auth/register-shop` and `POST /api/auth/login` are fully public. All other `/api/auth` sub-routes (e.g., create-staff, profile, change-password) require `authMiddleware` and most require `requireAdmin`. Everything outside `/api/auth` requires `authMiddleware`.

| Prefix | File | Role guard |
|--------|------|------------|
| `/api/auth/register-shop`, `/api/auth/login` | `routes/auth.js` | none |
| `/api/auth/*` (rest) | `routes/auth.js` | `authMiddleware` + `requireAdmin` |
| `/api/stock` | `routes/stock.js` | `requireStaff` |
| `/api/customers` | `routes/customer.js` | `requireAdmin` |
| `/api/quotations` | `routes/quotation.js` | mixed (most open, confirm/reject admin-only) |
| `/api/invoices` | `routes/invoice.js` | `requireAdmin` |
| `/api/audit` | `routes/audit.js` | `requireAdmin` |
| `/api/ai` | `routes/ai.js` | `requireAdmin` (stub — not wired to an AI service) |
| `/api/glass-price-master` | `routes/glassPriceMaster.js` | `requireAdmin` |
| `/api/architects` | `routes/architect.js` | `requireAdmin` |
| `/api/settings` | `routes/settings.js` | `requireAdmin` — GET returns `{ lowStockThreshold }`, PUT updates it |

Debug endpoints: `GET /health` and `GET /test` (both public, no auth).

**CORS**: `server.js` has two layers — a custom middleware that sets headers and handles OPTIONS, followed by the `cors` npm package as a fallback. Both are intentionally present; the custom layer was added for EC2 deployment debugging.

**Request logging**: A dedicated middleware runs *before* CORS and logs every incoming request (method, path, all headers, IP). This is intentional for production troubleshooting, not a dev-only artifact. The CORS layer adds its own origin-resolution log lines after that.

### Data Model Relationships

```
Shop
 ├── Users (ROLE_ADMIN, ROLE_STAFF)
 ├── Customers
 │    ├── Quotations → QuotationItems
 │    └── Invoices  → InvoiceItems
 │                  → Payments
 ├── Stock (tied to Glass types via glassId)
 └── Architects (business partners; referenced on Customer, Quotation, Invoice)

Glass → GlassPriceMaster (price catalog, scoped per shopId)
StockHistory (tracks changes by glassId + shopId + standNo, no direct stockId FK)
Site → Installations → Invoice
```

`Installation` and `Site` models are defined in the ORM but have **no API routes** — they are schema-ready but not yet wired to any endpoint.

`AuditLog` has **no `userId` FK** (the column was removed; the comment in `models/index.js` confirms this). Audit records identify actions by `shopId` and action metadata only, not by user.

### Sequelize Model Pattern

All models use a factory function: `module.exports = (sequelize) => { return sequelize.define(...) }`. Associations are wired in `glassshop-backend/models/index.js`, which is the single import point for the entire ORM layer.

### Stock Pricing and Status Flow

When stock is added or transferred, the backend checks `GlassPriceMaster` for a matching `(shopId, glassType, thickness)` entry:
- If an approved entry exists with prices → stock is created with `status: 'APPROVED'` and the prices from the master.
- If no entry exists or the entry is `isPending: true` → a pending entry is created/kept and stock gets `status: 'PENDING'`.

Every stock mutation (ADD, REMOVE, EDIT, TRANSFER) also creates an `AuditLog` row and a `StockHistory` row.

**Important quirk:** Stock route handlers respond with plain JSON strings (e.g., `res.json('✅ Stock added successfully')`), not JSON objects. Frontend checks for string responses.

### PDF Generation

`glassshop-backend/services/pdfService.js` uses PDFKit to generate invoice and quotation PDFs. Polish/custom data is serialized as `POLISH_DATA:<json>` embedded in the description field and parsed back out at render time.

### Glass Cutting Optimization

`glass-ai-agent-frontend/src/utils/optimizationService.js` is a pure-function module (no React, no API calls) that implements:
- Unit conversion helpers (`toMM`, `fromMM`, `parseDim`) — supports MM, INCH, FEET, and fraction strings like `"5 1/4"`.
- `findMatches` — scores stock items against an order using area waste + type/unit match bonus.
- `planCuts` — shelf (guillotine) bin-packing that returns placed pieces, a remnant rectangle, waste, utilization %, and step-by-step cut instructions.
- `optimizeOrders` — top-level entry point; classifies matches as `exact / good / partial / none` and finds combined plans for multiple orders from one sheet.

`glass-ai-agent-frontend/src/utils/printCuttingPlan.js` formats optimization output for PDF/print. The optimization UI lives at `/optimization` (admin-only).

### State Management

No Redux or Context API. Every page component manages its own state with `useState`. There is no global auth context — the token and role are read directly from `sessionStorage` wherever needed. The axios interceptor in `api.js` handles the redirect-on-401 side-effect globally, so individual components don't need to handle expired-session cases.

### Notification System

`react-toastify` is installed and configured in `glass-ai-agent-frontend/src/index.js` (position: top-right, autoClose: 3500ms). Usage is inconsistent across the codebase: some pages call `toast.success()` / `toast.error()` from react-toastify; others use browser `alert()` for quick errors; a few set local state to show inline status messages. New code should use react-toastify consistently.

### Backend Error Pattern

Route handlers follow try-catch throughout. On error: `res.status(4xx|5xx).json({ error: message })`. `NODE_ENV=development` responses include the full `error.stack`; production omits it. Sequelize constraint errors (e.g., `SequelizeUniqueConstraintError`) are caught explicitly in some routes and converted to 409 responses rather than generic 500s.

The per-request shop context pattern: every route handler that needs shopId calls `User.findOne({ where: { username: req.user.username } })` and uses `user.shopId` to scope all subsequent queries. There is no shopId in the JWT — it is always resolved from the DB.

### Frontend Stack Notes

The frontend uses **React Router v7** (`react-router-dom ^7`). This version has different APIs from v6 — consult v7 docs for loader/action patterns if extending routing.

Dashboard charts use **recharts** (`BarChart`, `LineChart`, `PieChart`). No other charting library is present.

### Frontend API Layer

- `glass-ai-agent-frontend/src/api/api.js` — axios instance with auth interceptors
- `glass-ai-agent-frontend/src/api/quotationApi.js` — all business-domain API calls (customers, quotations, invoices, architects, and stock); named `quotationApi` for historical reasons but is the primary client-side API module
- All page components import from these files rather than calling axios directly

### Frontend Route Map

All routes under `<Layout>` render with a sidebar (desktop) or top bar (mobile) from `Navbar.js`. `ProtectedRoute` redirects unauthenticated users to `/login`; `RequireAdmin` redirects non-admins to `/dashboard`.

| Path | Component | Access |
|------|-----------|--------|
| `/dashboard` | `Dashboard` | any logged-in |
| `/manage-stock` | `StockManager` | any logged-in |
| `/view-stock` | `StockDashboard` | any logged-in |
| `/stock-transfer` | `StockTransfer` | any logged-in |
| `/profile` | `Profile` | any logged-in |
| `/staff-quotations` | `StaffQuotationManagement` | `ROLE_STAFF` only |
| `/staff` | `ManageStaff` | `ROLE_ADMIN` |
| `/create-staff` | `CreateStaff` | `ROLE_ADMIN` |
| `/staff-management` | `StaffManagement` | `ROLE_ADMIN` |
| `/customers` | `CustomerManagement` | `ROLE_ADMIN` |
| `/quotations` | `QuotationManagement` | `ROLE_ADMIN` |
| `/invoices` | `InvoiceManagement` | `ROLE_ADMIN` |
| `/audit` | `AuditLog` | `ROLE_ADMIN` |
| `/ai` | `AiAssistant` | `ROLE_ADMIN` |
| `/glass-price-master` | `GlassPriceMaster` | `ROLE_ADMIN` |
| `/optimization` | `OptimizationPage` | `ROLE_ADMIN` |
| `/architects` | `ArchitectManagement` | `ROLE_ADMIN` |

**Staff pages**: `/staff` (`ManageStaff`) is the legacy list/edit/delete page; `/staff-management` (`StaffManagement`) is the newer unified view. Both are admin-only but are separate components with overlapping functionality.

### Frontend UI Components & Responsive Design

Reusable UI primitives live in `glass-ai-agent-frontend/src/components/ui/` (`Button`, `Card`, `Input`, `Select`, `Badge`, `StatCard`) and are exported from `components/ui/index.js`. A global design system stylesheet is at `styles/design-system.css`.

`PageWrapper` wraps every page's content area with a centered max-width-1400 container. Its `background`/`backgroundImage` props are accepted but **silently ignored** — all pages share the `#f8fafc` background set by `Layout.js`. Passing a background image prop to `PageWrapper` has no visual effect.

**Global CSS layers**: `index.css` sets `body` to a dark gradient (`#07122D → #040A18`) — visible in the sidebar/nav chrome and on unauthenticated pages. `App.css` applies a dark theme to **all `<table>` elements globally** (background `#111B35`, text `#A9B3D1`). Any new page with a `<table>` will inherit this styling without additional CSS.

All page components use **inline styles** rather than CSS modules or utility classes. New pages should follow the same pattern to stay consistent.

For responsive layouts, import `useResponsive` from `src/hooks/useResponsive.js`. It returns `{ isMobile, isTablet, isDesktop, isSmallMobile, isLargeMobile, isMobileOrTablet, width, height }`. Breakpoints: mobile < 768px, tablet 768–1023px, desktop ≥ 1024px.

### Testing

**Frontend:** Jest unit tests exist under `src/**/__tests__/` and `src/App.test.js`. Cypress E2E tests are in `cypress/e2e/` (login, dashboard, stock management). Cypress is configured in `cypress.config.js` with `baseUrl: http://localhost:3000`.

**Backend:** No test files currently exist in `glassshop-backend/`. The Jest config is set up and ready — add test files under `glassshop-backend/tests/` or alongside route files.

### Health Check

`GET /health` — no auth required, returns `{ status: "OK", ... }`. Use this to verify the backend is up.

## Deployment

The `deploy/` directory contains all production deployment artifacts:

- `create-all-tables.sql` — full schema for initial DB setup
- `migrations/*.sql` — incremental schema changes to apply manually when deploying schema updates
- `nginx.conf` — Nginx config that serves the React build and proxies `/api` → `localhost:8080`
- `ecosystem.config.js` — PM2 process config for running the Node backend
- `glassshop-backend.service` — systemd unit file alternative to PM2
- `aws-quick-deploy.sh` / `deploy.sh` / `deploy-from-github.sh` — shell scripts for EC2 deployments
- `update-application.sh` — update backend/frontend/both after a code push
- `backup-database.sh` — timestamped gzip backup; auto-purges backups older than 7 days
- `restore-database.sh` — interactive restore from a backup file (stops/starts backend automatically)

To upload the frontend build to S3 run `glass-ai-agent-frontend/s3-upload.sh` after `npm run build`.
