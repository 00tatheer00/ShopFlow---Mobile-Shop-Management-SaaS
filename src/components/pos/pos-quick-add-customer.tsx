'use client';

import { useState, useTransition, useEffect } from 'react';
import { UserPlus, X, Loader2 } from 'lucide-react';
import { createCustomer } from '@/app/(dashboard)/customers/actions';
import type { Customer } from '@/lib/types';
import { toast } from 'sonner';

interface PosQuickAddCustomerProps {
  open: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
}

export function PosQuickAddCustomer({ open, onClose, onCustomerCreated }: PosQuickAddCustomerProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isPending, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Customer name and phone number are required.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('phone', phone.trim());
    if (city.trim()) {
      formData.append('address', city.trim());
    }

    startTransition(async () => {
      const res = await createCustomer(formData);
      if (res.error) {
        toast.error(res.error);
      } else if (res.customer) {
        toast.success(`Customer "${res.customer.name}" added successfully.`);
        onCustomerCreated(res.customer as Customer);
        setName('');
        setPhone('');
        setCity('');
        onClose();
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div className="w-full max-w-xs rounded-xl border border-border bg-card p-4 shadow-2xl space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-foreground">Add New Customer</h3>
              <p className="text-[10px] text-muted-foreground">Quick counter registration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5 text-xs">
          <div>
            <label className="block font-bold text-foreground mb-0.5 text-[11px]">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Asad Khan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8.5 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-foreground mb-0.5 text-[11px]">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 03001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-8.5 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-foreground mb-0.5 text-[11px]">
              City / Address <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Lahore / Hafeez Centre"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-8.5 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="pt-1.5 flex justify-end gap-1.5 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim() || !phone.trim()}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-extrabold hover:bg-primary/90 transition shadow-xs cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Customer</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

