'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  X,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import type { Customer, Product, ProductCategory, Brand, PaymentMethod } from '@/lib/types';
import { formatPKR, toRupees } from '@/lib/types';
import { createSale } from '../actions';
import { createCustomer } from '../../customers/actions';
import { ReceiptModal, type ReceiptData } from '@/components/ui/receipt-modal';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { PageHeader } from '@/components/ui/page-header';

interface ProductWithStock extends Product {
  imei_records?: { id: string; imei_number: string; status: string }[];
}

interface PosTerminalProps {
  products: ProductWithStock[];
  customers: Customer[];
  categories: ProductCategory[];
  brands: Brand[];
  shopName: string;
}

interface CartItem {
  product: ProductWithStock;
  quantity: number;
  unit_price: number; // in rupees
  imei_record_id?: string;
  imei_number?: string;
}

export function PosTerminal({
  products,
  customers: initialCustomers,
  categories,
  brands,
  shopName,
}: PosTerminalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search & Filters for Products
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Modals & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Quick Add Customer
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);

  // IMEI Selection Modal when adding tracked phone
  const [imeiSelectProduct, setImeiSelectProduct] = useState<ProductWithStock | null>(null);

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (!p.is_active || p.stock_quantity <= 0) return false;
    if (selectedCategory && p.category_id !== selectedCategory) return false;
    if (selectedBrand && p.brand_id !== selectedBrand) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchModel = p.model?.toLowerCase().includes(q);
      const matchImei = p.imei_records?.some((i) => i.imei_number.includes(q));
      if (!matchName && !matchModel && !matchImei) return false;
    }
    return true;
  });

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const effectivePaid = amountPaid === '' ? total : Number(amountPaid);
  const due = Math.max(0, total - effectivePaid);

  function addToCart(product: ProductWithStock, imei?: { id: string; imei_number: string }) {
    if (product.is_imei_tracked && !imei) {
      // Prompt user to select an available IMEI
      setImeiSelectProduct(product);
      return;
    }

    setCart((prev) => {
      // If IMEI tracked, each unit is a distinct IMEI line
      if (product.is_imei_tracked && imei) {
        if (prev.some((item) => item.imei_record_id === imei.id)) {
          alert('This IMEI is already in the cart.');
          return prev;
        }
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unit_price: toRupees(product.sale_price),
            imei_record_id: imei.id,
            imei_number: imei.imei_number,
          },
        ];
      }

      // Non-IMEI item
      const existing = prev.find((item) => item.product.id === product.id && !item.imei_record_id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          alert(`Cannot add more than available stock (${product.stock_quantity})`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id && !item.imei_record_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unit_price: toRupees(product.sale_price),
          },
        ];
      }
    });

    setImeiSelectProduct(null);
  }

  function updateQuantity(index: number, delta: number) {
    setCart((prev) => {
      const item = prev[index];
      if (!item) return prev;
      if (item.imei_record_id) return prev; // IMEI items always quantity 1

      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      if (newQty > item.product.stock_quantity) {
        alert(`Maximum available stock is ${item.product.stock_quantity}`);
        return prev;
      }
      return prev.map((it, i) => (i === index ? { ...it, quantity: newQty } : it));
    });
  }

  function updatePrice(index: number, newPrice: number) {
    setCart((prev) =>
      prev.map((it, i) => (i === index ? { ...it, unit_price: Math.max(0, newPrice) } : it))
    );
  }

  function removeFromCart(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Please add items to checkout.');
      return;
    }

    if (due > 0 && !selectedCustomerId) {
      setErrorMessage('Please select a customer for Udhaar sales (payment not made in full).');
      return;
    }

    setErrorMessage(null);

    const payload = {
      customer_id: selectedCustomerId || undefined,
      items: cart.map((item) => ({
        product_id: item.product.id,
        imei_record_id: item.imei_record_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      discount: Number(discount) || 0,
      payment_method: paymentMethod,
      amount_paid: effectivePaid,
      notes: notes || undefined,
    };

    startTransition(async () => {
      const res = await createSale(payload);
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.success && res.saleId) {
        const activeCust = customers.find((c) => c.id === selectedCustomerId);
        const receipt: ReceiptData = {
          shopName: shopName || 'ShopFlow Mobile',
          invoiceNumber: res.invoiceNumber || 'INV',
          date: new Date().toLocaleDateString('en-PK', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          customerName: activeCust?.name || (due > 0 ? 'Valued Customer' : 'Walk-in Customer'),
          customerPhone: activeCust?.phone || null,
          items: cart.map((item) => ({
            id: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            unit_price: Math.round(item.unit_price * 100),
            total_price: Math.round(item.unit_price * item.quantity * 100),
            imei: item.imei_number || null,
          })),
          subtotal: Math.round(subtotal * 100),
          discount: Math.round((Number(discount) || 0) * 100),
          totalAmount: Math.round(total * 100),
          amountPaid: Math.round(effectivePaid * 100),
          amountDue: Math.round(due * 100),
          paymentMethod: paymentMethod.toUpperCase(),
        };

        setReceiptData(receipt);
        setShowReceipt(true);
      }
    });
  }

  function resetSale() {
    setCart([]);
    setDiscount(0);
    setAmountPaid('');
    setSelectedCustomerId('');
    setNotes('');
    setErrorMessage(null);
    setReceiptData(null);
    setShowReceipt(false);
    router.refresh();
  }

  async function handleQuickAddCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createCustomer(formData);
      if (res.error) {
        alert(res.error);
      } else {
        if (res.customer) {
          setCustomers((prev) => [...prev, res.customer as Customer]);
          setSelectedCustomerId(res.customer.id);
        }
        setIsAddCustomerOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="POS Terminal"
        description="Mobile Phone Shop Point of Sale & Thermal Receipt Billing"
        backHref="/sales"
      >
        <button
          onClick={resetSale}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Terminal
        </button>
      </PageHeader>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* POS Two-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Product Catalog & Search (7 Cols) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Search & Category Pills */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products by title, model, or scan IMEI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  !selectedCategory
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    selectedCategory === c.id
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {brands && brands.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center pt-2 border-t border-border">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">Brand:</span>
                <button
                  onClick={() => setSelectedBrand('')}
                  className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition ${
                    !selectedBrand
                      ? 'bg-secondary text-secondary-foreground'
                      : 'border border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All Brands
                </button>
                {brands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBrand(b.id)}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition ${
                      selectedBrand === b.id
                        ? 'bg-secondary text-secondary-foreground'
                        : 'border border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No available products found matching your filter.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const inStock = p.stock_quantity;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex flex-col justify-between rounded-xl border border-border bg-card p-3.5 text-left transition hover:border-primary hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-sm text-foreground line-clamp-1">
                          {p.name}
                        </span>
                        {p.is_imei_tracked && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            IMEI
                          </span>
                        )}
                      </div>
                      {p.model && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {p.model}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs font-medium text-muted-foreground">
                        Stock: <span className="font-bold text-foreground">{inStock}</span>
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {formatPKR(p.sale_price)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Cart & Checkout (5 Cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <h2 className="font-bold text-sm text-foreground">Sale Basket</h2>
              </div>
              <span className="text-xs text-muted-foreground">{cart.length} item(s)</span>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Select items from the catalog to add to cart
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={`${item.product.id}-${item.imei_record_id || idx}`}
                    className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs"
                  >
                    <div className="flex-1 pr-2">
                      <div className="font-semibold text-foreground line-clamp-1">
                        {item.product.name}
                      </div>
                      {item.imei_number && (
                        <div className="font-mono text-[10px] text-primary">
                          IMEI: {item.imei_number}
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-muted-foreground">Price: Rs.</span>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updatePrice(idx, Number(e.target.value))}
                          className="w-16 rounded border border-border px-1.5 py-0.5 text-xs font-semibold focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!item.imei_record_id ? (
                        <div className="flex items-center border border-border rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(idx, -1)}
                            className="p-1 hover:bg-muted text-muted-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 font-bold text-foreground">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(idx, 1)}
                            className="p-1 hover:bg-muted text-muted-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">1 unit</span>
                      )}

                      <div className="text-right">
                        <div className="font-bold text-foreground">
                          {formatPKR(item.quantity * item.unit_price * 100)}
                        </div>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer Selector */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Customer
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  + Add New
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">Walk-in Customer (Cash Only)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Payment & Financials */}
            <div className="pt-2 border-t border-border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-semibold text-foreground">{formatPKR(subtotal * 100)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discount (PKR):</span>
                <input
                  type="number"
                  min="0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-24 rounded border border-border px-2 py-1 text-right text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between font-bold text-sm text-foreground pt-1 border-t border-border">
                <span>Net Total:</span>
                <span className="text-base text-primary">{formatPKR(total * 100)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Amount Paid (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={String(total)}
                    value={amountPaid}
                    onChange={(e) =>
                      setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground focus:border-primary focus:outline-none font-semibold text-right"
                  />
                </div>
              </div>

              {/* Quick 1-touch Presets for Pakistani Shopkeepers */}
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                  Quick Payment Options:
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('cash');
                      setAmountPaid(total);
                    }}
                    className="rounded-lg border border-border bg-background py-1.5 text-[11px] font-semibold text-foreground hover:border-primary hover:bg-primary/5 transition-colors text-center"
                  >
                    Exact Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('easypaisa');
                      setAmountPaid(total);
                    }}
                    className="rounded-lg border border-border bg-background py-1.5 text-[11px] font-semibold text-foreground hover:border-primary hover:bg-primary/5 transition-colors text-center"
                  >
                    EasyPaisa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('jazzcash');
                      setAmountPaid(total);
                    }}
                    className="rounded-lg border border-border bg-background py-1.5 text-[11px] font-semibold text-foreground hover:border-primary hover:bg-primary/5 transition-colors text-center"
                  >
                    JazzCash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAmountPaid(0);
                    }}
                    className="rounded-lg border border-rose-300 text-rose-700 bg-rose-50/50 py-1.5 text-[11px] font-semibold hover:bg-rose-100/60 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400 transition-colors text-center"
                  >
                    Full Udhaar
                  </button>
                </div>
              </div>

              {due > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 flex justify-between items-center font-bold">
                  <span>Balance Due (Udhaar):</span>
                  <CurrencyDisplay amount={due * 100} isPaisas={true} variant="danger" size="sm" />
                </div>
              )}
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isPending}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Processing...' : `Complete Sale — ${formatPKR(total * 100)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Select IMEI Modal */}
      {imeiSelectProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Select Phone IMEI</h3>
              <button onClick={() => setImeiSelectProduct(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Product: <span className="font-semibold text-foreground">{imeiSelectProduct.name}</span>
            </div>

            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {imeiSelectProduct.imei_records && imeiSelectProduct.imei_records.length > 0 ? (
                imeiSelectProduct.imei_records
                  .filter((i) => i.status === 'in_stock')
                  .map((imei) => (
                    <button
                      key={imei.id}
                      onClick={() => addToCart(imeiSelectProduct, imei)}
                      className="w-full flex items-center justify-between rounded-lg border border-border p-2.5 text-xs font-mono hover:bg-muted text-foreground"
                    >
                      <span>{imei.imei_number}</span>
                      <span className="text-[10px] text-emerald-600 font-sans font-bold">In Stock</span>
                    </button>
                  ))
              ) : (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  No registered IMEIs in stock. Please purchase/receive IMEI stock first.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Quick Add Customer</h3>
              <button onClick={() => setIsAddCustomerOpen(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Customer Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Asad Khan"
                  className="w-full rounded border border-border p-2 bg-background focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Phone Number *</label>
                <input
                  type="text"
                  name="phone"
                  required
                  placeholder="e.g. 03001234567"
                  className="w-full rounded border border-border p-2 bg-background focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="rounded border border-border px-3 py-1.5 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {isPending ? 'Saving...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal with Direct Print & 80mm format */}
      <ReceiptModal
        open={showReceipt}
        onClose={resetSale}
        data={receiptData}
      />
    </div>
  );
}
