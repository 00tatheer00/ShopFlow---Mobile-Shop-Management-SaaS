# ShopFlow — Enterprise Mobile Shop Management SaaS

<div align="center">

![ShopFlow Banner](https://raw.githubusercontent.com/00tatheer00/ShopFlow---Mobile-Shop-Management-SaaS/master/public/banner.png)

[![Next.js](https://img.shields.io/badge/Next.js-16.3.8-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**A high-performance, multi-tenant SaaS platform tailored specifically for mobile phone retail, repair, and electronics shops.**  
Built with strict database-level tenant isolation, real-time IMEI lifecycle tracking, localized payment integrations (EasyPaisa, JazzCash, Cash, Udhaar), and 1-click WhatsApp customer ledger reminders.

[Live Demo](#) · [Key Features](#-key-features) · [Architecture](#-architecture--security) · [Getting Started](#-getting-started) · [Database Schema](#-database--migrations)

</div>

---

## 📱 Executive Overview

Mobile phone shops operate in a fast-paced environment requiring instant serial/IMEI verification, quick billing, vendor shipment recording, and tracking of customer credit balances (Udhaar / Khata).

**ShopFlow** addresses these challenges with an intuitive POS, enterprise-grade data isolation, and comprehensive financial reports:
- **Zero-lag POS billing**: Rapid search across title, model, or instant 15-digit IMEI barcode scans.
- **IMEI Traceability**: Audit history from vendor purchase order to end customer sale and warranty returns.
- **Customer Khata (Udhaar)**: Automated debt ledgers with single-click WhatsApp payment reminders in English and Urdu.
- **Real-time Profit & Loss**: Dynamic cost-of-goods calculation (COGS), operating expenses, and net profit margins.
- **Multi-Tenant SaaS**: Complete isolation per shop with Super Admin controls for subscription lifecycle and quotas.

---

## ✨ Key Features

### 🛒 High-Speed Point of Sale (POS)
- **Instant Product & IMEI Search**: Type or scan any 15-digit IMEI, title, or brand to instantly pull up the device.
- **1-Touch Payment Presets**: Instant buttons for **Exact Cash**, **EasyPaisa**, **JazzCash**, and **Full Udhaar**.
- **Customer Account Association**: Associate sales with registered customers or checkout walk-in guests with zero clicks.
- **Thermal Receipt Invoicing**: 80mm/58mm thermal receipt generation with instant browser print modal and Escape/backdrop dismissal.
- **Brand & Category Filtering**: Filter catalog on the fly by smartphone brand (Samsung, Apple, Xiaomi, Vivo, etc.).

### 🔍 15-Digit IMEI Inventory Lifecycle
- **Individual Serial Tracking**: Track smartphones, tablets, and smartwatches with unique 15-digit IMEI numbers.
- **Status Lifecycle**: Track devices across `in_stock`, `sold`, `returned`, and `damaged` states.
- **Bulk Inwarding**: Paste batches of comma- or newline-separated IMEIs directly during supplier purchase recording.
- **Standard Inventory Support**: Seamlessly manages non-IMEI items (chargers, protectors, handsfree, accessories).

### 📖 Customer Udhaar (Khata Ledger)
- **Automated Balance Tracking**: Unpaid or partial POS sales automatically debit the customer's ledger balance.
- **1-Click WhatsApp Reminders**: Generate pre-composed personalized payment reminders with outstanding balances sent directly via WhatsApp Web / App.
- **Manual Payment Recording**: Record cash or digital bank recoveries with immediate ledger history updating.

### 📦 Suppliers & Purchasing (Inward Stock)
- **Shipment Record Keeping**: Record incoming stock batches with supplier assignment, purchase costs, and notes.
- **Quick-Add Vendor**: Add new suppliers on the fly without leaving the purchase entry screen.
- **Accurate Profit Tracking**: Purchase prices establish dynamic weighted COGS for accurate gross profit reporting.

### 📊 Real-Time Financial Reports & Analytics
- **Executive P&L Dashboard**: 6-metric summary:
  1. Gross Sales Revenue
  2. Cost of Goods Sold (COGS)
  3. Gross Profit
  4. Operating Expenses
  5. Net Profit
  6. Total Outstanding Market Udhaar
- **Payment Method Distribution**: Inflow breakdown by Cash, EasyPaisa, JazzCash, and Bank Transfers.
- **Top Performing Products**: Unit volume and revenue ranking for inventory optimization.
- **Expense Categorization**: Shop rent, electric bills, staff tea/petty cash, and utilities.

### 🛡️ Super Admin Control Center
- **Tenant Fleet Overview**: Track total registered shops, active accounts, suspended tenants, and estimated MRR.
- **Lifecycle Management**: Activate, suspend, or deactivate shop accounts with mandatory internal audit justification.
- **Plan Tier Provisioning**: Assign custom quotas (Max Staff, Max Products, Expiry Dates) across Basic, Standard, and Pro tiers.
- **Strict Privacy Isolation**: Super Admin portal has **zero access** to customer balances, private transactions, or retail financial data.

---

## 🏗️ Architecture & Security

```
├── Client Browser (React 19 Server Components & Actions)
│     ▼
├── Next.js 16 Middleware (Session token refresh & Route Guards)
│     ▼
├── Next.js Server Actions (Authoritative Zod validation + RBAC permissions)
│     ▼
├── Supabase Client (@supabase/ssr with scoped Cookies)
│     ▼
└── PostgreSQL Database (Row Level Security enforced on every query with tenant shop_id)
```

### 🔒 Enterprise Security Guardrails
1. **Row Level Security (RLS)**: Enforced across all business tables (`products`, `sales`, `purchases`, `customers`, `suppliers`, `expenses`, `udhaar_ledger`). Even if an API request is manipulated, PostgreSQL rejects cross-tenant queries.
2. **Server-Side Authoritative RBAC**:
   - `super_admin`: Platform management only.
   - `shop_owner`: Full shop administrative access.
   - `manager`: Operational management (no sensitive shop deletion rights).
   - `cashier`: POS sales and customer lookup only.
3. **Defense in Depth**: Client-side buttons are convenience indicators; all permissions and shop boundaries are verified inside Server Actions before database mutation.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16.3.8](https://nextjs.org/) (App Router, Turbopack, Server Actions) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode) |
| **Frontend** | [React 19.2.8](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) |
| **Design System** | Custom OKLCH color tokens, [Base UI](https://base-ui.com/), [Lucide React](https://lucide.dev/) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL 15, Auth SSR, Row Level Security) |
| **Validation** | [Zod 4](https://zod.dev/) |
| **Analytics & Charts** | [Recharts](https://recharts.org/) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or later
- **npm**: `v10.x` or later
- **Supabase Account**: A free or pro project on [supabase.com](https://supabase.com)

### 1. Clone the Repository
```bash
git clone https://github.com/00tatheer00/ShopFlow---Mobile-Shop-Management-SaaS.git
cd ShopFlow---Mobile-Shop-Management-SaaS/shopflow
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Fill in your Supabase project credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup & Migrations
Execute the SQL migrations found in `supabase/migrations/` sequentially in your Supabase SQL Editor:
1. `001_initial_schema.sql` — Base schema, tables, RLS policies, and triggers.
2. `002_tenant_provisioning.sql` — Tenant isolation and subscription provisioning.
3. `003_inventory_adjustments.sql` — Atomic stock adjustment procedures.
4. `004_customer_supplier_udhaar.sql` — Phone normalization and ledger constraints.
5. `005_pos_sales_hardening.sql` — POS idempotency and checkout safeguards.
6. `006_expenses_reports_hardening.sql` — Expense categorization and analytics indexes.
7. `007_scale_indexes.sql` — Production composite query indexes.
8. `008_shop_subscriptions.sql` — Monthly subscription billing engine.

### 5. Run the Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📂 Project Structure

```
shopflow/
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Authentication flows (login, reset, forgot)
│   │   ├── (dashboard)/            # Shop tenant operational modules
│   │   │   ├── dashboard/          # Executive dashboard & metrics
│   │   │   ├── sales/              # Sales history & POS terminal (/sales/new)
│   │   │   ├── products/           # Inventory, brands, categories & edit flow
│   │   │   ├── purchases/          # Vendor shipment & IMEI inwarding
│   │   │   ├── customers/          # Customer registry & WhatsApp chat
│   │   │   ├── suppliers/          # Vendor profiles & supply logs
│   │   │   ├── udhaar/             # Credit ledger & WhatsApp reminders
│   │   │   ├── expenses/           # Petty cash & operational cost logs
│   │   │   ├── reports/            # Financial P&L & analytics
│   │   │   └── settings/           # Profile, preferences, and staff roles
│   │   ├── admin/                  # Super Admin portal (/admin)
│   │   ├── error.tsx               # Global error boundary
│   │   ├── loading.tsx             # Root loading skeleton
│   │   └── layout.tsx              # Root HTML wrapper with fonts
│   ├── components/
│   │   ├── admin/                  # Super Admin navigation & shells
│   │   ├── dashboard/              # Tenant navigation & responsive shell
│   │   └── ui/                     # Primitives (button, dialog, status-badge, etc.)
│   ├── hooks/                      # Custom React hooks
│   └── lib/
│       ├── supabase/               # SSR client, server client, & middleware
│       ├── auth.ts                 # Authoritative server authorization guards
│       ├── types.ts                # TypeScript domain models & PKR formatters
│       └── validations.ts          # Zod schemas for all mutations
├── supabase/
│   └── migrations/                 # Complete PostgreSQL DDL & RLS policies
├── package.json
└── tsconfig.json
```

---

## 🧪 Quality Assurance & Verification

The codebase is continuously validated with zero tolerance for lint or type defects:

```bash
# ESLint check
npm run lint
✔ 0 errors, 0 warnings

# TypeScript verification
npx tsc --noEmit
✔ 0 type errors

# Next.js Production Build
npm run build
✔ Compiled successfully (31 static & dynamic routes generated)
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Built with ❤️ for modern mobile shop entrepreneurs.
</div>
