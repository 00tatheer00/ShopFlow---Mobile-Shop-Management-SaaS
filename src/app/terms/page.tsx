import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfServicePage() {
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
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Last Updated: October 2026 &bull; <span className="text-amber-400">[Subject to Final Formal Legal Counsel Review]</span>
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h2 className="text-base font-semibold text-white mb-2">1. Subscription & License</h2>
            <p>
              ShopFlow provides shop owners and staff with access to our web-based inventory, IMEI tracking, and POS platform. Subscriptions are billed on a periodic basis according to your selected plan.
            </p>
          </section>

          <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h2 className="text-base font-semibold text-white mb-2">2. Acceptable Use & Pakistani Regulatory Compliance</h2>
            <p>
              You agree to use ShopFlow solely for legitimate commercial retail/wholesale mobile operations. You must not enter fraudulent IMEI numbers, counterfeit device registrations, or violate PTA (Pakistan Telecommunication Authority) regulations.
            </p>
          </section>

          <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h2 className="text-base font-semibold text-white mb-2">3. Account Security & RBAC</h2>
            <p>
              Shop owners are responsible for maintaining confidentiality of user accounts (Cashier, Manager, Owner). Staff permissions should adhere to the principle of least privilege.
            </p>
          </section>

          <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h2 className="text-base font-semibold text-white mb-2">4. Support & Service Level Commitments</h2>
            <p>
              ShopFlow technical assistance is provided under standard tier SLAs. Inquiries and outage reports can be submitted to <span className="text-blue-400 font-mono">support@shopflow.pk</span>.
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
