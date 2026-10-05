'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Smartphone,
  AlertCircle,
  X,
} from 'lucide-react';
import type { Product, Supplier } from '@/lib/types';
import { formatPKR, toRupees } from '@/lib/types';
import { createPurchase } from '../actions';
import { createSupplier } from '../../suppliers/actions';

interface PurchaseFormProps {
  suppliers: Supplier[];
  products: Product[];
}

interface PurchaseItemInput {
  productId: string;
  quantity: number;
  unitPrice: number; // in rupees
  imeiText: string; // newline or comma separated
}

export function PurchaseForm({ suppliers: initialSuppliers, products }: PurchaseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItemInput[]>([
    { productId: products[0]?.id || '', quantity: 1, unitPrice: toRupees(products[0]?.purchase_price || 0), imeiText: '' },
  ]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick add supplier
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);

  function addItem() {
    if (products.length === 0) return;
    setItems((prev) => [
      ...prev,
      {
        productId: products[0].id,
        quantity: 1,
        unitPrice: toRupees(products[0].purchase_price || 0),
        imeiText: '',
      },
    ]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) {
      alert('A purchase must have at least one product item.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, patch: Partial<PurchaseItemInput>) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, ...patch };

        // If product changed, update default unitPrice
        if (patch.productId && patch.productId !== item.productId) {
          const selectedProd = products.find((p) => p.id === patch.productId);
          if (selectedProd) {
            updated.unitPrice = toRupees(selectedProd.purchase_price || 0);
          }
        }
        return updated;
      })
    );
  }

  // Calculate total purchase cost
  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) {
      setErrorMessage('Please select a supplier.');
      return;
    }

    // Validate IMEIs for tracked products
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const prod = products.find((p) => p.id === item.productId);
      if (prod?.is_imei_tracked) {
        const imeis = item.imeiText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        if (imeis.length !== item.quantity) {
          setErrorMessage(
            `Product "${prod.name}" is IMEI tracked. You entered ${imeis.length} IMEIs, but quantity is ${item.quantity}.`
          );
          return;
        }
      }
    }

    setErrorMessage(null);

    const payload = {
      supplier_id: supplierId,
      purchase_date: purchaseDate,
      notes: notes || undefined,
      items: items.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const imeis = prod?.is_imei_tracked
          ? item.imeiText
              .split(/[\n,]+/)
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
          : [];

        return {
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          imei_numbers: imeis,
        };
      }),
    };

    startTransition(async () => {
      const res = await createPurchase(payload);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        router.push('/purchases');
      }
    });
  }

  async function handleQuickAddSupplier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createSupplier(formData);
      if (res.error) {
        alert(res.error);
      } else {
        if (res.supplier) {
          setSuppliers((prev) => [...prev, res.supplier as Supplier]);
          setSupplierId(res.supplier.id);
        }
        setIsAddSupplierOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/purchases"
          className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Record Supplier Purchase</h1>
          <p className="text-xs text-muted-foreground">
            Add incoming stock, assign serial numbers / IMEIs, and update inventory cost.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier & Purchase Date Card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground">Purchase Details</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">
                  Supplier <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(true)}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  + New Supplier
                </button>
              </div>

              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">-- Select Vendor / Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.company ? `(${s.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Purchase Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Notes / Delivery Bilty Reference
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Shipment from Hall Road, Bilty # 98452"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Product Items Card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Products Received</h2>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add Another Product
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => {
              const selectedProd = products.find((p) => p.id === item.productId);
              const isImei = selectedProd?.is_imei_tracked;

              return (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 text-xs"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end">
                    <div className="sm:col-span-5">
                      <label className="block font-semibold mb-1">Product</label>
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(idx, { productId: e.target.value })}
                        className="w-full rounded border border-border bg-background p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.model ? `(${p.model})` : ''} {p.is_imei_tracked ? '[IMEI]' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })
                        }
                        className="w-full rounded border border-border bg-background p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold mb-1">Unit Cost (PKR)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(idx, { unitPrice: Math.max(0, Number(e.target.value)) })
                        }
                        className="w-full rounded border border-border bg-background p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2 text-right">
                      <label className="block font-semibold mb-1">Total</label>
                      <div className="p-2 font-bold text-foreground">
                        {formatPKR(item.quantity * item.unitPrice * 100)}
                      </div>
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="rounded p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Remove Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* IMEI inputs if tracked */}
                  {isImei && (
                    <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-primary">
                        <span className="flex items-center gap-1">
                          <Smartphone className="h-3.5 w-3.5" />
                          Enter {item.quantity} IMEI Number(s) for {selectedProd?.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Separate with newlines or commas
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={item.imeiText}
                        onChange={(e) => updateItem(idx, { imeiText: e.target.value })}
                        placeholder={`e.g.\n352481098234123\n352481098234124`}
                        className="w-full rounded border border-border bg-background p-2 font-mono text-xs focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Total & Submit Button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-5">
          <div>
            <span className="text-xs text-muted-foreground uppercase font-semibold">
              Total Purchase Cost
            </span>
            <div className="text-2xl font-extrabold text-foreground">
              {formatPKR(totalCost * 100)}
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/purchases"
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending || items.length === 0}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Record Purchase'}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Add Supplier Modal */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Add New Supplier</h3>
              <button onClick={() => setIsAddSupplierOpen(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSupplier} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Supplier Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full rounded border border-border p-2 bg-background focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Company</label>
                <input
                  type="text"
                  name="company"
                  placeholder="e.g. Star Mobile Traders"
                  className="w-full rounded border border-border p-2 bg-background focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="e.g. 03001234567"
                  className="w-full rounded border border-border p-2 bg-background focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(false)}
                  className="rounded border border-border px-3 py-1.5 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {isPending ? 'Saving...' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
