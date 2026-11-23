'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Smartphone, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { loginAction } from '../actions';
import { Ur } from '@/components/ui/urdu';
import { SHOPFLOW_PAYMENT_CHANNELS } from '@/lib/payment-channels';

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
      // If successful, loginAction handles the redirect
    });
  }

  return (
    <div className="w-full max-w-[420px]">
      {/* Logo & Branding */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
          <Smartphone className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          ShopFlow
        </h1>
        <p className="mt-1.5 text-base text-muted-foreground">
          Sign in to your shop <Ur className="block text-center text-lg">اپنی دکان میں داخل ہوں</Ur>
        </p>
      </div>

      {/* Login Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {/* Error Message */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <div className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-destructive" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="flex items-baseline gap-2 text-sm font-semibold text-foreground"
            >
              Email <Ur className="text-sm text-muted-foreground">ای میل</Ur>
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                disabled={isPending}
                className="h-12 w-full rounded-xl border-2 border-input bg-background pl-10 pr-4 text-base text-foreground placeholder:text-muted-foreground transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="flex items-baseline gap-2 text-sm font-semibold text-foreground"
              >
                Password <Ur className="text-sm text-muted-foreground">پاس ورڈ</Ur>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                disabled={isPending}
                className="h-12 w-full rounded-xl border-2 border-input bg-background pl-10 pr-12 text-base text-foreground placeholder:text-muted-foreground transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            id="login-submit"
            className="relative mt-2 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <Ur className="text-base font-normal">داخل ہوں</Ur>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Help */}
      <p className="mt-5 rounded-xl bg-card/70 px-4 py-3 text-center text-sm text-muted-foreground">
        Password bhool gaye? Help ke liye WhatsApp karein{' '}
        <a
          href={`https://wa.me/92${SHOPFLOW_PAYMENT_CHANNELS.whatsapp.slice(1)}`}
          className="font-mono font-bold text-primary"
        >
          {SHOPFLOW_PAYMENT_CHANNELS.whatsapp}
        </a>
      </p>

      {/* Footer */}
      <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <p>ShopFlow — Mobile Shop Management SaaS</p>
        <div className="flex items-center gap-3">
          <Link href="/privacy" className="hover:text-primary transition underline underline-offset-2">
            Privacy Policy
          </Link>
          <span>&bull;</span>
          <Link href="/terms" className="hover:text-primary transition underline underline-offset-2">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
