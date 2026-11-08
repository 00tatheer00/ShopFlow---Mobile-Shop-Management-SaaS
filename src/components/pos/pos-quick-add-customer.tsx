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
      <div className="w-full max-w-sm rounded-2xl border-2 border-border bg-card p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-foreground">Add New Customer</h3>
              <p className="text-[11px] text-muted-foreground">Quick counter registration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-foreground mb-1">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Asad Khan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-xl border-2 border-border bg-background px-3 font-medium text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 03001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 w-full rounded-xl border-2 border-border bg-background px-3 font-medium text-foreground focus:border-primary focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-foreground mb-1">
              City / Address <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Lahore / Hafeez Centre"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-10 w-full rounded-xl border-2 border-border bg-background px-3 font-medium text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim() || !phone.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-extrabold hover:bg-primary/90 transition shadow-xs cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
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
