'use client';

import { useState, useTransition, useMemo, useDeferredValue } from 'react';
import Link from 'next/link';
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
  ArrowLeft,
} from 'lucide-react';
import type { Customer, Product, ProductCategory, Brand, PaymentMethod } from '@/lib/types';
import { formatPKR, toRupees } from '@/lib/types';
import { createSale } from '../actions';
import { createCustomer } from '../../customers/actions';
import { ReceiptModal, type ReceiptData } from '@/components/ui/receipt-modal';
import { CardInfoTooltip } from '@/components/ui/card-info-tooltip';
import { toast } from 'sonner';

interface ProductWithStock extends Product {
  imei_records?: { id: string; imei_number: string; status: string }[];
}

interface ProductTheme {
  bg: string;
  border: string;
  hoverBorder: string;
  badge: string;
  price: string;
  stock: string;
}

function getProductTheme(product: ProductWithStock, categories: ProductCategory[], index: number): ProductTheme {
  const cat = categories.find((c) => c.id === product.category_id)?.name?.toLowerCase() || '';
  if (cat.includes('smart') || cat.includes('phone') || product.is_imei_tracked) {
    return {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
      border: 'border-emerald-500/25 dark:border-emerald-800/40',
      hoverBorder: 'hover:border-emerald-500 dark:hover:border-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/30',
      price: 'text-emerald-700 dark:text-emerald-300',
      stock: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  if (cat.includes('used') || cat.includes('second') || cat.includes('kit') || cat.includes('old')) {
    return {
      bg: 'bg-amber-500/10 dark:bg-amber-950/40',
      border: 'border-amber-500/25 dark:border-amber-800/40',
      hoverBorder: 'hover:border-amber-500 dark:hover:border-amber-400',
      badge: 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30',
      price: 'text-amber-700 dark:text-amber-300',
      stock: 'text-amber-600 dark:text-amber-400',
    };
  }
  if (cat.includes('access') || cat.includes('charger') || cat.includes('cable') || cat.includes('handfree') || cat.includes('ear') || cat.includes('airpod')) {
    return {
      bg: 'bg-sky-500/10 dark:bg-sky-950/40',
      border: 'border-sky-500/25 dark:border-sky-800/40',
      hoverBorder: 'hover:border-sky-500 dark:hover:border-sky-400',
      badge: 'bg-sky-500/20 text-sky-800 dark:text-sky-200 border-sky-500/30',
      price: 'text-sky-700 dark:text-sky-300',
      stock: 'text-sky-600 dark:text-sky-400',
    };
  }
  if (cat.includes('glass') || cat.includes('protect') || cat.includes('sheet') || cat.includes('cover') || cat.includes('case')) {
    return {
      bg: 'bg-purple-500/10 dark:bg-purple-950/40',
      border: 'border-purple-500/25 dark:border-purple-800/40',
      hoverBorder: 'hover:border-purple-500 dark:hover:border-purple-400',
      badge: 'bg-purple-500/20 text-purple-800 dark:text-purple-200 border-purple-500/30',
      price: 'text-purple-700 dark:text-purple-300',
      stock: 'text-purple-600 dark:text-purple-400',
    };
  }

  const palettes: ProductTheme[] = [
    {
      bg: 'bg-indigo-500/10 dark:bg-indigo-950/40',
      border: 'border-indigo-500/25 dark:border-indigo-800/40',
      hoverBorder: 'hover:border-indigo-500 dark:hover:border-indigo-400',
      badge: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 border-indigo-500/30',
      price: 'text-indigo-700 dark:text-indigo-300',
      stock: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      bg: 'bg-rose-500/10 dark:bg-rose-950/40',
      border: 'border-rose-500/25 dark:border-rose-800/40',
      hoverBorder: 'hover:border-rose-500 dark:hover:border-rose-400',
      badge: 'bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/30',
      price: 'text-rose-700 dark:text-rose-300',
      stock: 'text-rose-600 dark:text-rose-400',
    },
    {
      bg: 'bg-teal-500/10 dark:bg-teal-950/40',
      border: 'border-teal-500/25 dark:border-teal-800/40',
      hoverBorder: 'hover:border-teal-500 dark:hover:border-teal-400',
      badge: 'bg-teal-500/20 text-teal-800 dark:text-teal-200 border-teal-500/30',
      price: 'text-teal-700 dark:text-teal-300',
      stock: 'text-teal-600 dark:text-teal-400',
    },
  ];
  return palettes[index % palettes.length];
}

interface PosTerminalProps {
  products: ProductWithStock[];
  customers: Customer[];
  categories: ProductCategory[];
  brands: Brand[];
  shopName: string;
  shopPhone?: string | null;
  shopAddress?: string | null;
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
  shopPhone,
  shopAddress,
}: PosTerminalProps) {
  const [isPending, startTransition] = useTransition();

  // Search & Filters for Products
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  // Local products state for optimistic stock updates (no router.refresh needed)
  const [localProducts, setLocalProducts] = useState(products);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  // Cart & Transaction
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [txKey, setTxKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx_${Date.now()}_${Math.random()}`
  );

  // Modals & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Quick Add Customer
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);

  // IMEI Selection Modal when adding tracked phone
  const [imeiSelectProduct, setImeiSelectProduct] = useState<ProductWithStock | null>(null);

  // Filter products (memoized + deferred search for instant typing)
  const filteredProducts = useMemo(() => localProducts.filter((p) => {
    if (!p.is_active || p.stock_quantity <= 0) return false;
    if (selectedCategory && p.category_id !== selectedCategory) return false;
    if (selectedBrand && p.brand_id !== selectedBrand) return false;
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchModel = p.model?.toLowerCase().includes(q);
      const matchImei = p.imei_records?.some((i) => i.imei_number.includes(q));
      if (!matchName && !matchModel && !matchImei) return false;
    }
    return true;
  }), [localProducts, deferredSearch, selectedCategory, selectedBrand]);

  // Cart Calculations (memoized subtotal)
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0), [cart]);
  const numDiscount = Number(discount) || 0;
  const total = Math.max(0, subtotal - numDiscount);
  const effectivePaid = amountPaid === '' ? total : Number(amountPaid);
  const due = Math.max(0, total - effectivePaid);
  const cashChange = paymentMethod === 'cash' && effectivePaid > total ? effectivePaid - total : 0;

  function addToCart(product: ProductWithStock, imei?: { id: string; imei_number: string }) {
    if (product.is_imei_tracked && !imei) {
      // Ask user to select an available IMEI
      setImeiSelectProduct(product);
      return;
    }

    setCart((prev) => {
      // If IMEI tracked, each unit is a distinct IMEI line
      if (product.is_imei_tracked && imei) {
        if (prev.some((item) => item.imei_record_id === imei.id)) {
          toast.error('This IMEI is already in the cart.');
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
          toast.error(`Cannot add more than available stock (${product.stock_quantity})`);
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
        toast.error(`Maximum available stock is ${item.product.stock_quantity}`);
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

    if (numDiscount > subtotal) {
      setErrorMessage('Discount cannot exceed the order subtotal amount.');
      return;
    }

    if (cart.some((it) => it.unit_price <= 0)) {
      setErrorMessage('All item prices must be greater than zero.');
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
      discount: numDiscount,
      payment_method: paymentMethod,
      amount_paid: effectivePaid,
      notes: notes || undefined,
      idempotency_key: txKey,
    };

    // ⚡ OPTIMISTIC: Show receipt INSTANTLY, process server call in background
    const activeCust = customers.find((c) => c.id === selectedCustomerId);
    const todayDateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const tempInvoice = `INV-${todayDateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
    const receipt: ReceiptData = {
      shopName: shopName || 'ShopFlow Mobile',
      shopPhone: shopPhone || null,
      shopAddress: shopAddress || null,
      invoiceNumber: tempInvoice,
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
      discount: Math.round(numDiscount * 100),
      totalAmount: Math.round(total * 100),
      amountPaid: Math.round(Math.min(effectivePaid, total) * 100),
      cashTendered: effectivePaid > total && paymentMethod === 'cash' ? Math.round(effectivePaid * 100) : undefined,
      cashChange: cashChange > 0 ? Math.round(cashChange * 100) : undefined,
      amountDue: Math.round(due * 100),
      paymentMethod: paymentMethod.toUpperCase(),
    };

    // Show receipt INSTANTLY (optimistic)
    setReceiptData(receipt);
    setShowReceipt(true);

    // Optimistically update local product stock
    const soldCart = [...cart];
    setLocalProducts((prev) =>
      prev.map((p) => {
        const soldItem = soldCart.find((ci) => ci.product.id === p.id);
        if (!soldItem) return p;
        return {
          ...p,
          stock_quantity: Math.max(0, p.stock_quantity - soldItem.quantity),
          imei_records: p.imei_records?.filter((i) => !soldCart.some((ci) => ci.imei_record_id === i.id)),
        };
      })
    );

    // Process sale in background — revert if server fails
    startTransition(async () => {
      const res = await createSale(payload);
      if (res.error) {
        setShowReceipt(false);
        setReceiptData(null);
        setLocalProducts(products);
        toast.error(res.error);
        setErrorMessage(res.error);
      } else if (res.success && res.invoiceNumber) {
        setReceiptData((prev) => prev ? { ...prev, invoiceNumber: res.invoiceNumber! } : null);
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
    setTxKey(
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx_${Date.now()}_${Math.random()}`
    );
  }

  async function handleQuickAddCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createCustomer(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        if (res.customer) {
          setCustomers((prev) => [...prev, res.customer as Customer]);
          setSelectedCustomerId(res.customer.id);
        }
        setIsAddCustomerOpen(false);
        toast.success('Customer added!');
      }
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-2 sm:gap-2.5">
      {/* Compact Top Bar */}
      <div className="shrink-0 flex items-center justify-between gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/sales"
            className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="h-4 w-px bg-border shrink-0 hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-foreground truncate">
              POS Terminal
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
            {shopName && (
              <span className="hidden md:inline-flex text-[11px] font-semibold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                {shopName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={resetSale}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Reset Terminal"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="shrink-0 flex items-center justify-between gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-0.5 hover:opacity-80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* POS Two-Column Viewport: Single-Screen Height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3">
        {/* Left Column: Product Catalog & Fast Filters (7-8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 h-full rounded-2xl border border-border bg-card p-2.5 sm:p-3 shadow-2xs">
          {/* Search & Category Pills (Pinned Header) */}
          <div className="shrink-0 space-y-2 pb-2.5 border-b border-border/70">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search product title, model, or scan IMEI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-background/80 pl-9 pr-8 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  !selectedCategory
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                All ({localProducts.filter((p) => p.is_active && p.stock_quantity > 0).length})
              </button>
              {categories.map((c) => {
                const isSelected = selectedCategory === c.id;
                const catLower = c.name.toLowerCase();
                let activeColor = 'bg-indigo-600 text-white';
                if (catLower.includes('smart') || catLower.includes('phone')) activeColor = 'bg-emerald-600 text-white';
                else if (catLower.includes('access')) activeColor = 'bg-sky-600 text-white';
                else if (catLower.includes('used')) activeColor = 'bg-amber-600 text-white';

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? `${activeColor} shadow-xs`
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>

            {/* Brand Chips */}
            {brands && brands.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1.5 border-t border-border/50">
                <span className="text-[11px] font-bold text-muted-foreground shrink-0 mr-1">Brand:</span>
                <button
                  type="button"
                  onClick={() => setSelectedBrand('')}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition shrink-0 cursor-pointer ${
                    !selectedBrand
                      ? 'bg-secondary text-secondary-foreground shadow-2xs'
                      : 'border border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All Brands
                </button>
                {brands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBrand(b.id)}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                      selectedBrand === b.id
                        ? 'bg-secondary text-secondary-foreground font-bold shadow-2xs'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Products Grid — Internal Scrollable Container */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 pt-2.5">
            {filteredProducts.length === 0 ? (
              <div className="h-full min-h-[160px] flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                <p className="font-semibold">No products found matching your filter</p>
                <p className="text-[11px] mt-1 text-muted-foreground">Try clearing search or picking another category</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
                {filteredProducts.map((p, idx) => {
                  const inStock = p.stock_quantity;
                  const theme = getProductTheme(p, categories, idx);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p)}
                      style={{ contentVisibility: 'auto' }}
                      className={`group relative flex flex-col justify-between rounded-xl border ${theme.bg} ${theme.border} ${theme.hoverBorder} p-2.5 sm:p-3 text-left transition-all duration-75 shadow-2xs hover:shadow-md active:scale-[0.97] cursor-pointer`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-bold text-xs sm:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {p.name}
                          </span>
                          {p.is_imei_tracked && (
                            <span className={`shrink-0 rounded px-1 py-0.2 text-[9px] font-black uppercase border ${theme.badge}`}>
                              IMEI
                            </span>
                          )}
                        </div>
                        {p.model && (
                          <p className="text-[11px] text-muted-foreground font-medium line-clamp-1">
                            {p.model}
                          </p>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-border/40">
                        <span className={`text-[10px] sm:text-[11px] font-semibold ${theme.stock}`}>
                          Stock: <span className="font-extrabold">{inStock}</span>
                        </span>
                        <span className={`text-xs sm:text-sm font-black ${theme.price}`}>
                          {formatPKR(p.sale_price)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Basket & Checkout (5-4 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-0 h-full rounded-2xl border border-indigo-500/20 bg-card shadow-2xs overflow-hidden">
          {/* Basket Header */}
          <div className="shrink-0 px-3 py-2.5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <ShoppingCart className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <h2 className="font-black text-xs sm:text-sm text-foreground tracking-tight">Sale Basket</h2>
              <CardInfoTooltip
                title="Sale Basket"
                urduDetail="Gahak ke liye select kiye gaye items ki list. Yahan se aap item ki qeemat ya quantity kam ya zyada kar sakte hain."
              />
              <span className="rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] px-2 py-0.5 border border-indigo-500/30 shrink-0">
                {cart.reduce((s, i) => s + i.quantity, 0)} item(s)
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Basket Items List — Internal Scrollable Container */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-6 text-center px-4">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-1.5">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-foreground">Basket is empty</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tap products or scan IMEI on the left to add items.
                </p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={`${item.product.id}-${item.imei_record_id || idx}`}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-background/80 p-2 text-xs shadow-2xs hover:border-indigo-400/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-bold text-foreground text-xs truncate">
                      {item.product.name}
                    </div>
                    {item.imei_number && (
                      <div className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                        IMEI: {item.imei_number}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[11px] text-muted-foreground font-semibold">Rs</span>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updatePrice(idx, Number(e.target.value))}
                        className="w-20 rounded border border-border bg-card px-1.5 py-0.5 text-xs font-black text-foreground focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!item.imei_record_id ? (
                      <div className="flex items-center border border-border rounded-lg overflow-hidden bg-card">
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, -1)}
                          className="p-1 hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                          title="Decrease"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-1.5 font-black text-xs text-foreground min-w-[18px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, 1)}
                          className="p-1 hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                          title="Increase"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        1 unit
                      </span>
                    )}

                    <div className="text-right min-w-[65px]">
                      <div className="font-black text-xs text-foreground">
                        {formatPKR(item.quantity * item.unit_price * 100)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(idx)}
                        className="text-rose-500 hover:text-rose-700 p-0.5 mt-0.5 transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5 inline" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Controls Panel (Pinned Bottom) */}
          <div className="shrink-0 p-2.5 sm:p-3 bg-muted/40 border-t border-border space-y-2">
            {/* Customer Selector */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <label className="font-bold text-foreground flex items-center gap-1 text-[11px]">
                    <User className="h-3 w-3 text-indigo-500" />
                    Customer (Gahak)
                  </label>
                  <CardInfoTooltip
                    title="Customer (Gahak)"
                    urduDetail="Aam naqd gahak ke liye Walk-in Customer rehne dein. Agar Udhaar par maal dena hai to gahak select karna lazmi hai."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  + Add New
                </button>
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="">Walk-in Customer (Cash Only)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Subtotal & Discount */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px] font-medium">Subtotal:</span>
                <span className="font-bold text-foreground">{formatPKR(subtotal * 100)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px] font-medium">Discount (Rs):</span>
                <input
                  type="number"
                  min="0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-20 rounded border border-border bg-card px-2 py-0.5 text-right text-xs font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Vibrant Net Total Banner */}
            <div className="rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white p-2 sm:p-2.5 shadow-md flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-200 block">
                    Net Payable Total
                  </span>
                  <CardInfoTooltip
                    title="Net Payable Total"
                    urduDetail="Subtotal mein se discount minus karne ke baad gahak se lene wali aakhri kul raqam."
                  />
                </div>
                <span className="text-xs text-indigo-100 font-medium">
                  {cart.reduce((s, i) => s + i.quantity, 0)} Items Selected
                </span>
              </div>
              <span className="text-lg sm:text-xl font-black tracking-tight text-white">
                {formatPKR(total * 100)}
              </span>
            </div>

            {/* Payment Method & Amount Paid */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-lg border border-border bg-card p-1 text-xs font-semibold text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="cash">Cash</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
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
                  className="w-full rounded-lg border border-border bg-card p-1 text-xs text-foreground focus:border-indigo-500 focus:outline-none font-bold text-right"
                />
              </div>
            </div>

            {/* Quick 1-touch Presets (Color-coded) */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cash');
                  setAmountPaid(total);
                }}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 py-1 text-[11px] font-bold transition-colors text-center cursor-pointer"
              >
                Exact Cash
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('easypaisa');
                  setAmountPaid(total);
                }}
                className="rounded-lg border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 py-1 text-[11px] font-bold transition-colors text-center cursor-pointer"
              >
                EasyPaisa
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('jazzcash');
                  setAmountPaid(total);
                }}
                className="rounded-lg border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-800 dark:text-orange-300 py-1 text-[11px] font-bold transition-colors text-center cursor-pointer"
              >
                JazzCash
              </button>
              <button
                type="button"
                onClick={() => {
                  setAmountPaid(0);
                }}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 py-1 text-[11px] font-bold transition-colors text-center cursor-pointer"
              >
                Full Udhaar
              </button>
            </div>

            {/* Udhaar / Change alert strip */}
            {due > 0 && (
              <div className="rounded-lg border border-rose-300 bg-rose-500/15 p-1.5 text-xs text-rose-800 dark:text-rose-300 flex justify-between items-center font-bold">
                <span>Balance Due (Udhaar):</span>
                <span>{formatPKR(due * 100)}</span>
              </div>
            )}

            {cashChange > 0 && paymentMethod === 'cash' && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-500/15 p-1.5 text-xs text-emerald-800 dark:text-emerald-300 flex justify-between items-center font-bold">
                <span>Change to Return (Wapsi):</span>
                <span>{formatPKR(cashChange * 100)}</span>
              </div>
            )}

            {/* Complete Sale Action Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isPending}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white py-2.5 px-4 text-xs sm:text-sm font-black shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                'Processing Sale...'
              ) : (
                <>
                  <span>Complete Sale</span>
                  <span className="opacity-70">—</span>
                  <span>{formatPKR(total * 100)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Select IMEI Modal */}
      {imeiSelectProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
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
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
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
