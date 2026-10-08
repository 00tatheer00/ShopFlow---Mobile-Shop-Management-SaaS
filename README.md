# ShopFlow — Mobile Shop Management SaaS

ShopFlow is a modern, high-performance web platform built for mobile phone retail and repair shops in Pakistan. It provides complete stock management, IMEI tracking, POS billing, customer Udhaar ledgers, and expense reporting.

---

## Features

- **Point of Sale (POS)**: Fast billing with instant IMEI/barcode scanning, support for Cash, EasyPaisa, JazzCash, and Udhaar (credit) payments.
- **Inventory & IMEI Management**: Track each handset by unique 15-digit IMEI number with complete status history (in-stock, sold, returned).
- **Customer Khata (Udhaar)**: Keep customer credit ledgers with balance history and 1-click WhatsApp payment reminders.
- **Supplier & Purchase Orders**: Record stock inwarding from wholesale dealers with batch cost and supplier balances.
- **Daily Cash Reconciliation**: Track daily sales, operating expenses (utilities, tea, food, shop rent), and calculate real gross and net profit.
- **Multi-Tenant Architecture**: Complete shop-level data isolation using Supabase PostgreSQL Row Level Security (RLS).
- **Progressive Web App (PWA)**: Installable on Android, iPhone, tablet, and desktop with offline support.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Actions)
- **Language**: TypeScript
- **Frontend**: React 19, Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL 15, SSR Auth, RLS)
- **UI Components**: Lucide React, Recharts, Sonner

---

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm 10 or later
- Supabase project

### 1. Installation

```bash
git clone https://github.com/00tatheer00/ShopFlow---Mobile-Shop-Management-SaaS.git
cd ShopFlow---Mobile-Shop-Management-SaaS/shopflow
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Run the SQL migration scripts in `supabase/migrations/` sequentially in your Supabase SQL editor:

- `001_initial_schema.sql`
- `002_tenant_provisioning.sql`
- `003_inventory_adjustments.sql`
- `004_customer_supplier_udhaar.sql`
- `005_pos_sales_hardening.sql`
- `006_expenses_reports_hardening.sql`
- `007_scale_indexes.sql`
- `008_shop_subscriptions.sql`
- `009_fast_pos_checkout.sql`
- `010_update_subscription_price_to_8000.sql`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
shopflow/
├── src/
│   ├── app/                 # Next.js App Router pages and API routes
│   │   ├── (auth)/          # Authentication (login, password reset)
│   │   ├── (dashboard)/     # Main shop operations (sales, products, udhaar, expenses)
│   │   └── admin/           # Platform administration portal
│   ├── components/          # Reusable UI components and dashboard layouts
│   └── lib/                 # Database clients, auth helpers, types, validations
├── supabase/                # PostgreSQL schema and migration scripts
├── public/                  # Static assets and PWA icons
└── package.json
```

---

## License

This project is licensed under the MIT License.
