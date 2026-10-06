import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-12">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        <div>
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-emerald-400 transition mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Last Updated: October 2026 &bull; <span className="text-amber-400">[Subject to Final Formal Legal Counsel Review]</span>
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h2 className="text-base font-semibold text-white mb-2">1. Scope & Multi-Tenant Data Isolation</h2>
            <p>
              ShopFlow is a multi-tenant SaaS platform built specifically for mobile phone retail and wholesale businesses in Pakistan. Every tenant shop operates in an isolated cryptographic and relational data boundary secured by Row-Level Security (RLS). Your shop data (inventory, IMEI numbers, customer phone numbers, Udhaar transactions, and sales) is never accessible by other tenants or third parties.
            </p>
          </section>

          <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h2 className="text-base font-semibold text-white mb-2">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Shop Account Details:</strong> Shop name, city, address, owner contact number, email address.</li>
              <li><strong>Business Records:</strong> Products, IMEI records, purchase orders, customer phone numbers and names, and Udhaar ledger records created by your authorized users.</li>
              <li><strong>Audit & Security Logs:</strong> Timestamps, user IDs, and operational actions for auditability and fraud prevention.</li>
            </ul>
          </section>

          <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h2 className="text-base font-semibold text-white mb-2">3. Storage & Infrastructure</h2>
            <p>
              All production databases and secure backups are hosted on enterprise cloud infrastructure with encrypted storage at rest (AES-256) and TLS 1.3 encryption in transit. Automated point-in-time recovery ensures business continuity.
            </p>
          </section>

          <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h2 className="text-base font-semibold text-white mb-2">4. Support & Contact</h2>
            <p>
              For data protection questions, account closure, or data export requests, please contact the ShopFlow operational support desk at <span className="text-emerald-400 font-mono">support@shopflow.pk</span>.
            </p>
          </section>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 mt-12">
        &copy; {new Date().getFullYear()} ShopFlow Technologies. All rights reserved.
      </div>
    </div>
  );
}
