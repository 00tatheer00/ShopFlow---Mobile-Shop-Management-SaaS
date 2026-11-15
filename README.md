# ShopFlow — Mobile Shop Management SaaS

ShopFlow is a mobile-shop operations platform for retailers and repair businesses. The application brings sales, handset inventory, customer balances, purchasing, and shop expenses into one workspace.

## Product capabilities

- **Point of Sale:** Create sales and record payment methods, including cash, digital payments, and customer credit (Udhaar).
- **IMEI inventory:** Track handsets by their unique IMEI and maintain stock and sales records.
- **Customer ledgers:** Review customer balances and payment history.
- **Purchasing:** Record supplier purchases and incoming stock.
- **Expenses and reporting:** Record operating expenses and review business performance.
- **Multi-tenant data protection:** Uses Supabase PostgreSQL Row Level Security (RLS) for shop-level data isolation.
- **Installable experience:** Includes Progressive Web App assets and a service worker.

## Technology

| Area | Stack |
|---|---|
| Application | Next.js 16, App Router, Server Actions |
| Language | TypeScript |
| UI | React 19, Tailwind CSS |
| Database and authentication | Supabase, PostgreSQL, Supabase SSR |
| Validation | Zod |
| Charts and notifications | Recharts, Sonner |
| Icons | Lucide React |

## Requirements

- Node.js 20+
- npm 10+
- A Supabase project

## Run locally

The Next.js application and `package.json` are at the repository root.

```bash
git clone https://github.com/00tatheer00/ShopFlow---Mobile-Shop-Management-SaaS.git
cd ShopFlow---Mobile-Shop-Management-SaaS
npm install
```

Create `.env.local` in the repository root. Start from the committed example:

```bash
cp .env.local.example .env.local
```

Set the values for your Supabase project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: required for privileged server-side admin provisioning.
# Never expose this value through a NEXT_PUBLIC_ variable.
SUPABASE_SERVICE_ROLE_KEY=
```

Install and run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database setup

Apply the SQL files in `supabase/migrations/` to your Supabase project in filename order. Keep the database schema and migration history in sync with the version of the application you deploy.

## Useful scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

## Repository layout

```text
.
├── src/
│   ├── app/              # App Router pages, layouts, and actions
│   ├── components/       # Shared UI components
│   └── lib/              # Supabase clients, validation, and utilities
├── public/               # Static assets and PWA files
├── supabase/
│   └── migrations/       # SQL schema migrations
├── .env.local.example
└── package.json
```

## Security notes

- Keep `.env.local` out of Git; commit only placeholder examples.
- The Supabase service-role key is privileged. Use it only in server-side code and never expose it to browser bundles.
- Keep Row Level Security enabled and review policies before deploying changes.
- Use separate credentials for development and production.

## License

MIT

---

## Repository standards

- [Contribution guidelines](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)
- [Pull request template](./.github/PULL_REQUEST_TEMPLATE.md)
