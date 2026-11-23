'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  X,
  AlertCircle,
  Menu,
  Check,
  Banknote,
  Smartphone,
  Wallet,
  Loader2,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  RotateCcw,
  Printer,
  MessageCircle,
  Keyboard,
  Percent,
  Tag,
  PackageOpen,
} from 'lucide-react';
import type { Customer, ProductCategory, Brand, PaymentMethod } from '@/lib/types';
import { formatPKR, toRupees } from '@/lib/types';
import { UR } from '@/lib/i18n';
import { createSale } from '../actions';
import { createCustomer } from '../../customers/actions';
import { ReceiptModal, type ReceiptData } from '@/components/ui/receipt-modal';
import { Ur } from '@/components/ui/urdu';
import type { ProductWithStock } from '@/components/pos/pos-types';
import { toast } from 'sonner';

interface PosTerminalProps {
  products: ProductWithStock[];
  customers: Customer[];
  categories: ProductCategory[];
  brands: Brand[];
  shopName: string;
  shopPhone?: string | null;
  shopAddress?: string | null;
  defaultPaymentMethod?: PaymentMethod;
}

interface CartItem {
  key: string;
  product: ProductWithStock;
  quantity: number;
  unit_price: number; // rupees
  imei_record_id?: string;
  imei_number?: string;
}

type PayMode = 'cash' | 'online' | 'udhaar';
type OnlineMethod = 'easypaisa' | 'jazzcash' | 'bank_transfer';
type DiscountType = 'rs' | 'percent';

const ONLINE_METHODS: { id: OnlineMethod; label: string; cls: string }[] = [
  { id: 'easypaisa', label: 'EasyPaisa', cls: 'bg-emerald-600' },
  { id: 'jazzcash', label: 'JazzCash', cls: 'bg-orange-500' },
  { id: 'bank_transfer', label: 'Bank', cls: 'bg-sky-600' },
];

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'CASH',
  easypaisa: 'EASYPAISA',
  jazzcash: 'JAZZCASH',
  bank_transfer: 'BANK TRANSFER',
  other: 'OTHER',
};

/** Card accent per category (first match wins), otherwise rotate through a palette. */
const CATEGORY_ACCENTS = [
  { test: /phone|mobile|smart|tablet/i, bar: 'bg-sky-500', chip: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' },
  { test: /used|second|old/i, bar: 'bg-amber-500', chip: 'bg-amber-500', soft: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  { test: /charg|cable|power|adapter/i, bar: 'bg-emerald-500', chip: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  { test: /hand|ear|audio|speaker|airpod|headphone/i, bar: 'bg-fuchsia-500', chip: 'bg-fuchsia-500', soft: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300' },
  { test: /cover|case|glass|protect|sheet/i, bar: 'bg-violet-500', chip: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300' },
];
const FALLBACK_ACCENTS = [
  { bar: 'bg-rose-500', chip: 'bg-rose-500', soft: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' },
  { bar: 'bg-teal-500', chip: 'bg-teal-500', soft: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300' },
  { bar: 'bg-indigo-500', chip: 'bg-indigo-500', soft: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' },
];

function newTxKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

const money = (rupees: number) => formatPKR(Math.round(rupees * 100));

interface CompletedSale {
  invoiceNumber: string;
  total: number;
  change: number;
  due: number;
  customerName: string | null;
  customerPhone: string | null;
  method: string;
  itemCount: number;
}

export function PosTerminal({
  products,
  customers: initialCustomers,
  categories,
  shopName,
  shopPhone,
  shopAddress,
  defaultPaymentMethod = 'cash',
}: PosTerminalProps) {
  const [isSaving, startSaving] = useTransition();
  const [isAddingCustomer, startAddingCustomer] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  // Catalogue
  const [localProducts, setLocalProducts] = useState(products);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Bill
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('rs');
  const [discountInput, setDiscountInput] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);
  const initialMode: PayMode = defaultPaymentMethod === 'cash' ? 'cash' : 'online';
  const initialOnline: OnlineMethod =
    defaultPaymentMethod === 'jazzcash' || defaultPaymentMethod === 'bank_transfer' ? defaultPaymentMethod : 'easypaisa';
  const [payMode, setPayMode] = useState<PayMode>(initialMode);
  const [onlineMethod, setOnlineMethod] = useState<OnlineMethod>(initialOnline);
  const [receivedInput, setReceivedInput] = useState('');
  const [txKey, setTxKey] = useState(newTxKey);

  // Customers
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [customerId, setCustomerId] = useState('');
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);

  // UI state
  const [mobileView, setMobileView] = useState<'items' | 'bill'>('items');
  const [imeiProduct, setImeiProduct] = useState<ProductWithStock | null>(null);
  const [imeiQuery, setImeiQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [completed, setCompleted] = useState<CompletedSale | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === customerId) || null;

  // ---------------- catalogue ----------------
  const accentFor = useMemo(() => {
    const map = new Map<string, (typeof FALLBACK_ACCENTS)[number]>();
    categories.forEach((c, i) => {
      const match = CATEGORY_ACCENTS.find((a) => a.test.test(c.name));
      map.set(c.id, match || FALLBACK_ACCENTS[i % FALLBACK_ACCENTS.length]);
    });
    return (p: ProductWithStock) =>
      (p.category_id && map.get(p.category_id)) || (p.is_imei_tracked ? CATEGORY_ACCENTS[0] : FALLBACK_ACCENTS[2]);
  }, [categories]);

  const inStockProducts = useMemo(() => localProducts.filter((p) => p.is_active && p.stock_quantity > 0), [localProducts]);

  const filteredProducts = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return inStockProducts.filter((p) => {
      if (selectedCategory && p.category_id !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q) ||
        (p.imei_records || []).some((i) => i.imei_number.includes(q))
      );
    });
  }, [inStockProducts, deferredSearch, selectedCategory]);

  const cartQty = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of cart) m.set(i.product.id, (m.get(i.product.id) || 0) + i.quantity);
    return m;
  }, [cart]);

  // ---------------- money ----------------
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.quantity * i.unit_price, 0), [cart]);
  const discountRaw = Math.max(0, Number(discountInput) || 0);
  const discount = Math.min(
    subtotal,
    discountType === 'percent' ? Math.round((subtotal * Math.min(discountRaw, 100)) / 100) : discountRaw
  );
  const total = Math.max(0, subtotal - discount);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const received =
    payMode === 'online'
      ? total
      : receivedInput.trim() === ''
        ? payMode === 'cash'
          ? total
          : 0
        : Math.max(0, Number(receivedInput) || 0);
  const paidTowardsBill = Math.min(received, total);
  const due = Math.max(0, total - paidTowardsBill);
  const change = payMode === 'cash' && received > total ? received - total : 0;
  const paymentMethod: PaymentMethod = payMode === 'online' ? onlineMethod : 'cash';

  // ---------------- helpers ----------------
  const focusSearch = useCallback(() => {
    setTimeout(() => {
      if (window.matchMedia('(min-width: 1024px)').matches) searchRef.current?.focus();
    }, 60);
  }, []);

  function addProduct(product: ProductWithStock, imei?: { id: string; imei_number: string }) {
    setErrorMessage(null);

    if (product.is_imei_tracked && !imei) {
      const available = (product.imei_records || []).filter(
        (r) => r.status === 'in_stock' && !cart.some((c) => c.imei_record_id === r.id)
      );
      if (available.length === 0) {
        toast.error('No more phones of this model in stock', { description: product.name });
        return;
      }
      if (available.length === 1) {
        addProduct(product, available[0]);
        return;
      }
      setImeiQuery('');
      setImeiProduct(product);
      return;
    }

    if (imei) {
      if (cart.some((i) => i.imei_record_id === imei.id)) {
        toast.error('This phone is already in the bill');
        return;
      }
      setCart((prev) => [
        ...prev,
        {
          key: `imei-${imei.id}`,
          product,
          quantity: 1,
          unit_price: toRupees(product.sale_price),
          imei_record_id: imei.id,
          imei_number: imei.imei_number,
        },
      ]);
      setImeiProduct(null);
      toast.success(`${product.name} added`, { description: `IMEI …${imei.imei_number.slice(-6)}`, duration: 1400 });
      focusSearch();
      return;
    }

    const existing = cart.find((i) => i.product.id === product.id && !i.imei_record_id);
    if (existing) {
      if (existing.quantity >= product.stock_quantity) {
        toast.error(`Only ${product.stock_quantity} in stock`, { description: product.name });
        return;
      }
      setCart((prev) => prev.map((i) => (i.key === existing.key ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart((prev) => [...prev, { key: `p-${product.id}`, product, quantity: 1, unit_price: toRupees(product.sale_price) }]);
    }
    toast.success(`${product.name} added`, { duration: 1200 });
    focusSearch();
  }

  function changeQty(key: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((i) => {
        if (i.key !== key || i.imei_record_id) return [i];
        const q = i.quantity + delta;
        if (q <= 0) return [];
        if (q > i.product.stock_quantity) {
          toast.error(`Only ${i.product.stock_quantity} in stock`);
          return [i];
        }
        return [{ ...i, quantity: q }];
      })
    );
  }

  function changePrice(key: string, value: string) {
    const price = Math.max(0, Number(value) || 0);
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, unit_price: price } : i)));
  }

  function removeItem(key: string) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  function handleSearchEnter() {
    const q = search.trim();
    if (!q) return;
    if (/^\d{15}$/.test(q)) {
      for (const p of inStockProducts) {
        const rec = p.imei_records?.find((r) => r.imei_number === q && r.status === 'in_stock');
        if (rec) {
          addProduct(p, rec);
          setSearch('');
          return;
        }
      }
      toast.error('No phone in stock with this IMEI');
      return;
    }
    if (filteredProducts.length === 1) {
      addProduct(filteredProducts[0]);
      setSearch('');
    } else if (filteredProducts.length === 0) {
      toast.error('Nothing found', { description: q });
    }
  }

  const resetSale = useCallback(() => {
    setCart([]);
    setDiscountInput('');
    setDiscountType('rs');
    setShowDiscount(false);
    setReceivedInput('');
    setCustomerId('');
    setPayMode(initialMode);
    setOnlineMethod(initialOnline);
    setErrorMessage(null);
    setCompleted(null);
    setReceipt(null);
    setShowReceipt(false);
    setConfirmOpen(false);
    setMobileView('items');
    setTxKey(newTxKey());
    focusSearch();
  }, [initialMode, initialOnline, focusSearch]);

  // ---------------- checkout ----------------
  /** Step 1: validate and show the confirmation sheet. */
  const requestCheckout = useCallback(() => {
    setErrorMessage(null);
    if (cart.length === 0) {
      toast.error('Bill is empty', { description: 'Tap an item to add it' });
      return;
    }
    if (cart.some((i) => i.unit_price <= 0)) {
      setErrorMessage('Every item needs a price above zero.');
      return;
    }
    if (due > 0 && !customerId) {
      setMobileView('bill');
      setCustomerPickerOpen(true);
      setErrorMessage('Udhaar needs a customer — please choose the customer. (گاہک چنیں)');
      return;
    }
    setConfirmOpen(true);
  }, [cart, due, customerId]);

  /** Step 2: save on the server. The receipt only appears after the server confirms. */
  function confirmSale() {
    if (isSaving) return;
    const snapshot = [...cart];
    const payload = {
      customer_id: customerId || undefined,
      items: snapshot.map((i) => ({
        product_id: i.product.id,
        imei_record_id: i.imei_record_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      discount,
      payment_method: paymentMethod,
      amount_paid: received,
      idempotency_key: txKey,
    };

    startSaving(async () => {
      let res: Awaited<ReturnType<typeof createSale>>;
      try {
        res = await createSale(payload);
      } catch {
        setConfirmOpen(false);
        setErrorMessage('Internet problem — the sale was NOT saved. Please try again.');
        toast.error('Sale not saved', { description: 'Check your internet and try again' });
        return;
      }

      if (!res.success) {
        setConfirmOpen(false);
        setErrorMessage(res.error);
        toast.error('Sale not saved', { description: res.error });
        return;
      }

      // Update on-screen stock (all lines of the same product are summed)
      const soldQty = new Map<string, number>();
      const soldImeis = new Set<string>();
      for (const i of snapshot) {
        soldQty.set(i.product.id, (soldQty.get(i.product.id) || 0) + i.quantity);
        if (i.imei_record_id) soldImeis.add(i.imei_record_id);
      }
      setLocalProducts((prev) =>
        prev.map((p) =>
          soldQty.has(p.id)
            ? {
                ...p,
                stock_quantity: Math.max(0, p.stock_quantity - (soldQty.get(p.id) || 0)),
                imei_records: p.imei_records?.filter((r) => !soldImeis.has(r.id)),
              }
            : p
        )
      );

      const methodLabel = due > 0 ? `${PAYMENT_LABEL[paymentMethod]} + UDHAAR` : PAYMENT_LABEL[paymentMethod];

      setReceipt({
        shopName: shopName || 'Mobile Shop',
        shopPhone: shopPhone || null,
        shopAddress: shopAddress || null,
        invoiceNumber: res.invoiceNumber,
        date: new Date().toLocaleString('en-PK', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Karachi',
        }),
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        customerPhone: selectedCustomer?.phone || null,
        items: snapshot.map((i) => ({
          id: i.key,
          name: i.product.name,
          quantity: i.quantity,
          unit_price: Math.round(i.unit_price * 100),
          total_price: Math.round(i.unit_price * i.quantity * 100),
          imei: i.imei_number || null,
        })),
        subtotal: Math.round(subtotal * 100),
        discount: Math.round(discount * 100),
        totalAmount: Math.round(total * 100),
        amountPaid: Math.round(paidTowardsBill * 100),
        cashTendered: change > 0 ? Math.round(received * 100) : undefined,
        cashChange: change > 0 ? Math.round(change * 100) : undefined,
        amountDue: Math.round(due * 100),
        paymentMethod: methodLabel,
      });

      setCompleted({
        invoiceNumber: res.invoiceNumber,
        total,
        change,
        due,
        customerName: selectedCustomer?.name || null,
        customerPhone: selectedCustomer?.phone || null,
        method: methodLabel,
        itemCount,
      });
      setConfirmOpen(false);
      toast.success(res.isDuplicate ? 'Sale was already saved' : 'Sale saved!', { description: res.invoiceNumber });
    });
  }

  // ---------------- keyboard ----------------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (completed && !showReceipt && e.key === 'Enter') {
        e.preventDefault();
        resetSale();
        return;
      }
      if (e.key === 'F2' || (e.key === '/' && !typing)) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (confirmOpen) confirmSale();
        else if (!completed) requestCheckout();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---------------- customers ----------------
  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const list = q
      ? customers.filter((c) => c.name.toLowerCase().includes(q) || (digits.length > 2 && c.phone.includes(digits)))
      : customers;
    return list.slice(0, 60);
  }, [customers, customerQuery]);

  function handleAddCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startAddingCustomer(async () => {
      const res = await createCustomer(formData);
      if (res.error) {
        toast.error('Customer not saved', { description: res.error });
        return;
      }
      if (res.customer) {
        const c = res.customer as Customer;
        setCustomers((prev) => [c, ...prev.filter((x) => x.id !== c.id)]);
        setCustomerId(c.id);
        setErrorMessage(null);
      }
      setAddingCustomer(false);
      setCustomerPickerOpen(false);
      setCustomerQuery('');
      toast.success('Customer added');
    });
  }

  function whatsappBillUrl(sale: CompletedSale) {
    if (!sale.customerPhone) return null;
    let phone = sale.customerPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = `92${phone.slice(1)}`;
    const lines = [
      `Assalam-o-Alaikum ${sale.customerName || ''},`,
      `${shopName} se aap ki khareedari ka shukriya!`,
      ``,
      `Bill: ${sale.invoiceNumber}`,
      `Total: ${money(sale.total)}`,
      sale.due > 0 ? `Baqi udhaar: ${money(sale.due)}` : `Poori raqam wasool ho gayi.`,
    ];
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  // ======================= RENDER =======================
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* -------- Top bar (dark ink, matches sidebar) -------- */}
      <div className="flex h-14 shrink-0 items-center gap-2 bg-sidebar px-2 text-white sm:px-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('shopflow:toggle-sidebar'))}
          className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="hidden h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-md sm:flex">
          <ShoppingCart className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="flex items-baseline gap-2 truncate text-base font-bold">
            New Sale <Ur className="text-sm font-normal text-white/70">{UR.newSale}</Ur>
          </p>
          <p className="truncate text-xs text-white/50">{shopName}</p>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="hidden items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/60 xl:inline-flex">
            <Keyboard className="h-3.5 w-3.5" />
            <kbd className="rounded bg-white/10 px-1.5 font-mono">F2</kbd> search
            <kbd className="ml-1 rounded bg-white/10 px-1.5 font-mono">Ctrl+Enter</kbd> sell
          </span>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setClearOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/15"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Clear bill</span>
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mx-2 mt-2 flex shrink-0 items-start justify-between gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 sm:mx-3 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
        >
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            {errorMessage}
          </span>
          <button onClick={() => setErrorMessage(null)} className="rounded-lg p-1 hover:bg-rose-100 dark:hover:bg-rose-900" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-2 sm:p-3 lg:grid-cols-12">
        {/* ================= Items ================= */}
        <section
          className={`min-h-0 flex-col lg:col-span-7 lg:flex xl:col-span-8 ${mobileView === 'items' ? 'flex' : 'hidden'}`}
          aria-label="Items"
        >
          <div className="shrink-0 space-y-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-500" />
              <input
                ref={searchRef}
                type="search"
                autoComplete="off"
                placeholder="Search item, model or scan IMEI…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchEnter();
                  }
                }}
                className="h-13 w-full rounded-2xl border-2 border-transparent bg-card pl-12 pr-12 text-base text-foreground shadow-sm ring-1 ring-border placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/15"
                aria-label="Search items"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-lg border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground lg:block">
                  F2
                </kbd>
              )}
            </div>

            {categories.length > 0 && (
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                <CategoryChip active={!selectedCategory} onClick={() => setSelectedCategory('')} dot="bg-violet-500">
                  All <span className="opacity-70">{inStockProducts.length}</span>
                </CategoryChip>
                {categories.map((c) => {
                  const count = inStockProducts.filter((p) => p.category_id === c.id).length;
                  if (count === 0) return null;
                  const accent = CATEGORY_ACCENTS.find((a) => a.test.test(c.name));
                  return (
                    <CategoryChip
                      key={c.id}
                      active={selectedCategory === c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      dot={accent?.chip || 'bg-slate-400'}
                    >
                      {c.name} <span className="opacity-70">{count}</span>
                    </CategoryChip>
                  );
                })}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-24 pt-1 lg:pb-2">
            {filteredProducts.length === 0 ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card/50 p-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <PackageOpen className="h-7 w-7 text-muted-foreground" />
                </span>
                <p className="mt-3 font-bold text-foreground">
                  {inStockProducts.length === 0 ? 'No items in stock' : 'No item found'}
                </p>
                <Ur className="text-muted-foreground">
                  {inStockProducts.length === 0 ? 'پہلے مال خریداری میں مال درج کریں' : 'کوئی آئٹم نہیں ملا'}
                </Ur>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredProducts.map((p) => {
                  const inCart = cartQty.get(p.id) || 0;
                  const low = p.stock_quantity <= p.low_stock_threshold;
                  const accent = accentFor(p);
                  const category = categories.find((c) => c.id === p.category_id)?.name;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '132px' }}
                      className={`group relative flex min-h-[132px] flex-col overflow-hidden rounded-2xl bg-card text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] ${
                        inCart > 0 ? 'ring-2 ring-emerald-500' : 'ring-border hover:ring-violet-300'
                      }`}
                    >
                      <span className={`h-1.5 w-full ${accent.bar}`} aria-hidden="true" />
                      <span className="flex flex-1 flex-col p-3">
                        <span className="flex items-start justify-between gap-1">
                          <span className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground">{p.name}</span>
                          {inCart > 0 ? (
                            <span className="animate-pop flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-sm font-bold text-white shadow">
                              {inCart}
                            </span>
                          ) : (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition group-hover:bg-violet-500 group-hover:text-white">
                              <Plus className="h-4 w-4" />
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 truncate text-sm text-muted-foreground">{p.model || category || ' '}</span>
                        <span className="mt-auto flex items-end justify-between gap-1 pt-2">
                          <span className="font-mono text-[17px] font-extrabold text-foreground">{formatPKR(p.sale_price)}</span>
                          <span
                            className={`rounded-lg px-1.5 py-0.5 text-xs font-bold ${
                              p.is_imei_tracked
                                ? accent.soft
                                : low
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {p.is_imei_tracked ? `IMEI · ${p.stock_quantity}` : `${p.stock_quantity} left`}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ================= Bill ================= */}
        <section
          className={`min-h-0 flex-col overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border lg:col-span-5 lg:flex xl:col-span-4 ${
            mobileView === 'bill' ? 'flex' : 'hidden'
          }`}
          aria-label="Bill"
        >
          {/* header */}
          <div className="flex shrink-0 items-center gap-2 bg-emerald-600 px-3 py-2.5 text-white">
            <button
              type="button"
              onClick={() => setMobileView('items')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 lg:hidden"
              aria-label="Back to items"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <ShoppingCart className="hidden h-5 w-5 lg:block" />
            <h2 className="flex items-baseline gap-2 text-base font-bold">
              Current Bill <Ur className="text-sm font-normal text-white/85">{UR.bill}</Ur>
            </h2>
            <span className="ml-auto rounded-full bg-white/20 px-2.5 py-0.5 text-sm font-bold">
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </span>
          </div>

          {/* lines */}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
            {cart.length === 0 ? (
              <div className="flex h-full min-h-[150px] flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/50">
                  <ShoppingCart className="h-7 w-7" />
                </span>
                <p className="mt-3 font-bold text-foreground">Bill is empty</p>
                <Ur className="text-muted-foreground">آئٹم پر ٹیپ کریں یا IMEI اسکین کریں</Ur>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.key} className="rounded-2xl bg-muted/50 p-2.5 ring-1 ring-border animate-in fade-in-0 slide-in-from-right-2 duration-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-foreground">{item.product.name}</p>
                      {item.imei_number && (
                        <p className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">IMEI {item.imei_number}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950"
                      aria-label={`Remove ${item.product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1 rounded-xl bg-card px-2.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-violet-500">
                      <span className="text-sm font-semibold text-muted-foreground">Rs</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={item.unit_price || ''}
                        onChange={(e) => changePrice(item.key, e.target.value)}
                        className="h-10 w-24 bg-transparent font-mono text-base font-bold text-foreground focus:outline-none"
                        aria-label={`Price for ${item.product.name}`}
                      />
                    </label>
                    {item.imei_record_id ? (
                      <span className="text-sm font-semibold text-muted-foreground">× 1</span>
                    ) : (
                      <div className="flex items-center rounded-xl bg-card ring-1 ring-border">
                        <button type="button" onClick={() => changeQty(item.key, -1)} className="flex h-10 w-10 items-center justify-center rounded-l-xl hover:bg-muted" aria-label="One less">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-8 text-center font-mono text-base font-bold">{item.quantity}</span>
                        <button type="button" onClick={() => changeQty(item.key, 1)} className="flex h-10 w-10 items-center justify-center rounded-r-xl hover:bg-muted" aria-label="One more">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <span className="min-w-[84px] text-right font-mono text-base font-extrabold text-foreground">
                      {money(item.unit_price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* checkout */}
          <div className="shrink-0 space-y-2.5 border-t border-border bg-muted/30 p-3">
            {/* customer */}
            <button
              type="button"
              onClick={() => {
                setCustomerQuery('');
                setAddingCustomer(false);
                setCustomerPickerOpen(true);
              }}
              className={`flex min-h-12 w-full items-center gap-3 rounded-2xl bg-card px-3 text-left ring-1 transition hover:ring-violet-400 ${
                due > 0 && !customerId ? 'ring-2 ring-rose-500' : 'ring-border'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
                  selectedCustomer ? 'bg-fuchsia-600' : 'bg-slate-400'
                }`}
              >
                <User className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-foreground">
                  {selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {selectedCustomer ? selectedCustomer.phone : <Ur>{UR.walkIn} — بدلنے کے لیے ٹیپ کریں</Ur>}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* payment mode */}
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
              <PayTile active={payMode === 'cash'} onClick={() => { setPayMode('cash'); setReceivedInput(''); }} icon={Banknote} en="Cash" ur={UR.cash} gradient="bg-emerald-600" />
              <PayTile active={payMode === 'online'} onClick={() => { setPayMode('online'); setReceivedInput(''); }} icon={Smartphone} en="Online" ur={UR.onlinePay} gradient="bg-sky-600" />
              <PayTile
                active={payMode === 'udhaar'}
                onClick={() => {
                  setPayMode('udhaar');
                  setReceivedInput('');
                  if (!customerId) setCustomerPickerOpen(true);
                }}
                icon={Wallet}
                en="Udhaar"
                ur={UR.credit}
                gradient="bg-amber-400 !text-amber-950"
              />
            </div>

            {payMode === 'online' && (
              <div className="grid grid-cols-3 gap-1.5">
                {ONLINE_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setOnlineMethod(m.id)}
                    className={`h-10 rounded-xl text-sm font-bold transition ${
                      onlineMethod === m.id
                        ? `${m.cls} text-white shadow-md`
                        : 'bg-card text-foreground ring-1 ring-border hover:ring-sky-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {payMode !== 'online' && cart.length > 0 && (
              <div className="space-y-1.5">
                <label className="flex items-center justify-between gap-3">
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-bold text-foreground">{payMode === 'cash' ? 'Customer gave' : 'Paid now'}</span>
                    <Ur className="text-xs text-muted-foreground">{payMode === 'cash' ? 'گاہک نے کتنے دیے' : 'ابھی کتنے دیے'}</Ur>
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder={payMode === 'cash' ? String(total) : '0'}
                    value={receivedInput}
                    onChange={(e) => setReceivedInput(e.target.value)}
                    className="h-11 w-36 rounded-xl bg-card px-3 text-right font-mono text-lg font-bold text-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </label>
                {payMode === 'cash' && (
                  <div className="flex gap-1.5">
                    {[500, 1000, 5000].map((note) => (
                      <button
                        key={note}
                        type="button"
                        onClick={() => setReceivedInput(String((Number(receivedInput) || 0) + note))}
                        className="h-9 flex-1 rounded-lg bg-card text-sm font-bold text-emerald-700 ring-1 ring-border hover:ring-emerald-400 dark:text-emerald-300"
                      >
                        +{note.toLocaleString()}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setReceivedInput('')}
                      className="h-9 flex-1 rounded-lg bg-card text-sm font-bold text-muted-foreground ring-1 ring-border hover:ring-slate-400"
                    >
                      Exact
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* discount */}
            {showDiscount ? (
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <Tag className="h-4 w-4 text-fuchsia-500" /> Discount <Ur className="text-xs font-normal text-muted-foreground">{UR.discount}</Ur>
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex overflow-hidden rounded-lg ring-1 ring-border">
                    {(['rs', 'percent'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDiscountType(t)}
                        className={`flex h-10 w-10 items-center justify-center text-sm font-bold ${
                          discountType === t ? 'bg-fuchsia-500 text-white' : 'bg-card text-muted-foreground'
                        }`}
                        aria-label={t === 'rs' ? 'Rupees' : 'Percent'}
                      >
                        {t === 'rs' ? 'Rs' : <Percent className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    autoFocus
                    placeholder="0"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="h-10 w-24 rounded-xl bg-card px-3 text-right font-mono text-base font-bold ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
              </div>
            ) : (
              cart.length > 0 && (
                <button type="button" onClick={() => setShowDiscount(true)} className="inline-flex items-center gap-1.5 text-sm font-bold text-fuchsia-600 dark:text-fuchsia-400">
                  <Tag className="h-4 w-4" /> Add discount <Ur className="text-xs font-normal">رعایت</Ur>
                </button>
              )
            )}

            {/* total */}
            <div className="rounded-2xl bg-sidebar p-3.5 text-white shadow-lg">
              {discount > 0 && (
                <div className="mb-1 flex justify-between text-sm text-white/70">
                  <span>Items {money(subtotal)}</span>
                  <span className="text-fuchsia-300">− {money(discount)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-white/80">
                  Total <Ur className="text-sm">{UR.total}</Ur>
                </span>
                <span className="font-mono text-3xl font-extrabold tabular-nums text-emerald-300">{money(total)}</span>
              </div>
              {change > 0 && (
                <div className="mt-2 flex justify-between rounded-xl bg-emerald-500 px-3 py-1.5 font-bold">
                  <span>
                    Give back <Ur className="text-sm">{UR.change}</Ur>
                  </span>
                  <span className="font-mono">{money(change)}</span>
                </div>
              )}
              {due > 0 && (
                <div className="mt-2 flex justify-between rounded-xl bg-amber-400 px-3 py-1.5 font-bold text-amber-950">
                  <span>
                    Udhaar <Ur className="text-sm">{UR.remaining}</Ur>
                  </span>
                  <span className="font-mono">{money(due)}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={requestCheckout}
              disabled={cart.length === 0 || isSaving}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-lg font-extrabold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-700"
            >
              <Check className="h-6 w-6" /> Complete Sale <Ur className="text-base font-normal">{UR.completeSale}</Ur>
            </button>
          </div>
        </section>
      </div>

      {/* -------- phone: sticky bill bar -------- */}
      {mobileView === 'items' && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background to-transparent p-2 pt-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileView('bill')}
            disabled={cart.length === 0}
            className="flex h-14 w-full items-center justify-between rounded-2xl bg-emerald-600 px-4 text-white shadow-sm disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
          >
            <span className="flex items-center gap-2 text-base font-bold">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white/25 px-2">{itemCount}</span>
              View bill <Ur className="text-sm font-normal">بل دیکھیں</Ur>
            </span>
            <span className="flex items-center gap-1 font-mono text-lg font-extrabold">
              {money(total)} <ChevronRight className="h-5 w-5" />
            </span>
          </button>
        </div>
      )}

      {/* -------- IMEI picker -------- */}
      {imeiProduct && (
        <Sheet title="Choose phone (IMEI)" ur={UR.chooseImei} accent="bg-sky-600" onClose={() => setImeiProduct(null)}>
          <p className="font-semibold text-foreground">{imeiProduct.name}</p>
          <input
            type="search"
            inputMode="numeric"
            autoFocus
            placeholder="Type last digits of IMEI…"
            value={imeiQuery}
            onChange={(e) => setImeiQuery(e.target.value)}
            className="input-lg mt-3"
          />
          <div className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto">
            {(imeiProduct.imei_records || [])
              .filter((r) => r.status === 'in_stock' && !cart.some((c) => c.imei_record_id === r.id))
              .filter((r) => !imeiQuery || r.imei_number.includes(imeiQuery.replace(/\D/g, '')))
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addProduct(imeiProduct, r)}
                  className="flex h-12 w-full items-center justify-between rounded-xl px-3 font-mono text-base ring-1 ring-border transition hover:bg-sky-50 hover:ring-sky-400 dark:hover:bg-sky-950/40"
                >
                  <span>
                    {r.imei_number.slice(0, -6)}
                    <strong className="text-sky-600 dark:text-sky-400">{r.imei_number.slice(-6)}</strong>
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white">
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              ))}
          </div>
        </Sheet>
      )}

      {/* -------- Customer picker -------- */}
      {customerPickerOpen && (
        <Sheet title="Choose customer" ur="گاہک چنیں" accent="bg-fuchsia-600" onClose={() => setCustomerPickerOpen(false)}>
          {addingCustomer ? (
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <Field label="Name" ur="نام">
                <input name="name" required autoFocus placeholder="e.g. Asad Khan" className="input-lg" />
              </Field>
              <Field label="Mobile number" ur="موبائل نمبر">
                <input name="phone" required inputMode="tel" placeholder="03001234567" className="input-lg font-mono" />
              </Field>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setAddingCustomer(false)} className="h-12 flex-1 rounded-xl font-bold ring-1 ring-border hover:bg-muted">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isAddingCustomer}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-fuchsia-600 font-bold text-white disabled:opacity-60"
                >
                  {isAddingCustomer && <Loader2 className="h-4 w-4 animate-spin" />} Save customer
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="search"
                  autoFocus
                  placeholder="Search name or phone…"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  className="input-lg flex-1"
                />
                <button
                  type="button"
                  onClick={() => setAddingCustomer(true)}
                  className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-fuchsia-600 px-3 font-bold text-white"
                >
                  <UserPlus className="h-5 w-5" />
                  <span className="hidden sm:inline">New</span>
                </button>
              </div>
              <div className="mt-3 max-h-[55vh] space-y-1.5 overflow-y-auto">
                <CustomerRow active={!customerId} onClick={() => { setCustomerId(''); setCustomerPickerOpen(false); }} name="Walk-in customer" sub={<Ur>{UR.walkIn}</Ur>} />
                {filteredCustomers.map((c) => (
                  <CustomerRow
                    key={c.id}
                    active={customerId === c.id}
                    onClick={() => {
                      setCustomerId(c.id);
                      setCustomerPickerOpen(false);
                      setErrorMessage(null);
                    }}
                    name={c.name}
                    sub={<span className="font-mono">{c.phone}</span>}
                  />
                ))}
                {filteredCustomers.length === 0 && (
                  <button type="button" onClick={() => setAddingCustomer(true)} className="w-full py-6 text-center font-bold text-fuchsia-600">
                    Not found — add new customer
                  </button>
                )}
              </div>
            </>
          )}
        </Sheet>
      )}

      {/* -------- Clear bill confirm -------- */}
      {clearOpen && (
        <Sheet title="Clear this bill?" ur="بل صاف کریں؟" accent="bg-rose-600" onClose={() => setClearOpen(false)}>
          <p className="text-muted-foreground">All {itemCount} items will be removed from the bill.</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setClearOpen(false)} className="h-12 flex-1 rounded-xl font-bold ring-1 ring-border hover:bg-muted">
              Keep bill
            </button>
            <button
              onClick={() => {
                setClearOpen(false);
                resetSale();
                toast('Bill cleared');
              }}
              className="h-12 flex-1 rounded-xl bg-rose-600 font-bold text-white"
            >
              Yes, clear
            </button>
          </div>
        </Sheet>
      )}

      {/* -------- Confirm sale -------- */}
      {confirmOpen && (
        <Sheet title="Confirm sale" ur="سیل کی تصدیق" accent="bg-emerald-600" onClose={() => !isSaving && setConfirmOpen(false)}>
          <div className="rounded-2xl bg-sidebar p-4 text-white">
            <p className="text-sm text-white/70">Total to receive</p>
            <p className="font-mono text-4xl font-extrabold text-emerald-300">{money(total)}</p>
            <p className="mt-1 text-sm text-white/70">
              {itemCount} item{itemCount === 1 ? '' : 's'} · {selectedCustomer?.name || 'Walk-in customer'}
            </p>
          </div>
          <dl className="mt-3 space-y-2 text-[15px]">
            <SummaryRow label="Payment" value={payMode === 'online' ? ONLINE_METHODS.find((m) => m.id === onlineMethod)?.label : payMode === 'cash' ? 'Cash' : 'Udhaar'} />
            {discount > 0 && <SummaryRow label="Discount" value={`− ${money(discount)}`} />}
            {payMode !== 'online' && <SummaryRow label={payMode === 'cash' ? 'Customer gave' : 'Paid now'} value={money(received)} />}
            {change > 0 && <SummaryRow label="Give back" value={money(change)} strong="text-emerald-600 dark:text-emerald-400" />}
            {due > 0 && <SummaryRow label="Udhaar (baqi)" value={money(due)} strong="text-amber-600 dark:text-amber-400" />}
          </dl>
          <div className="mt-4 flex gap-2">
            <button disabled={isSaving} onClick={() => setConfirmOpen(false)} className="h-14 flex-1 rounded-2xl font-bold ring-1 ring-border hover:bg-muted disabled:opacity-50">
              Back
            </button>
            <button
              onClick={confirmSale}
              disabled={isSaving}
              autoFocus
              className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-lg font-extrabold text-white shadow-lg disabled:opacity-70"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Saving… <Ur className="text-base font-normal">محفوظ ہو رہا ہے</Ur>
                </>
              ) : (
                <>
                  <Check className="h-6 w-6" /> Yes, sell <Ur className="text-base font-normal">ہاں، سیل کریں</Ur>
                </>
              )}
            </button>
          </div>
        </Sheet>
      )}

      {/* -------- Success -------- */}
      {completed && !showReceipt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-card shadow-2xl animate-in slide-in-from-bottom-6 sm:rounded-3xl">
            <div className="relative bg-emerald-600 px-6 pb-6 pt-8 text-center text-white">
              <span className="animate-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-emerald-500 shadow-xl">
                <Check className="h-11 w-11" strokeWidth={3} />
              </span>
              <p className="mt-4 text-2xl font-extrabold">Sale complete!</p>
              <Ur className="text-lg text-white/90">سیل مکمل ہو گئی</Ur>
              <p className="mt-2 font-mono text-sm text-white/85">{completed.invoiceNumber}</p>
            </div>
            <div className="space-y-2 p-5">
              <SummaryRow label="Total" value={money(completed.total)} strong="text-foreground text-xl" />
              <SummaryRow label="Payment" value={completed.method} />
              {completed.change > 0 && (
                <div className="flex items-center justify-between rounded-2xl bg-emerald-500 px-4 py-3 text-white">
                  <span className="font-bold">
                    Give back <Ur>{UR.change}</Ur>
                  </span>
                  <span className="font-mono text-2xl font-extrabold">{money(completed.change)}</span>
                </div>
              )}
              {completed.due > 0 && (
                <div className="flex items-center justify-between rounded-2xl bg-amber-400 px-4 py-3 text-amber-950">
                  <span className="font-bold">
                    Udhaar added <Ur>ادھار میں لکھا</Ur>
                  </span>
                  <span className="font-mono text-2xl font-extrabold">{money(completed.due)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setShowReceipt(true)}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl font-bold ring-1 ring-border hover:bg-muted"
                >
                  <Printer className="h-5 w-5" /> Print bill
                </button>
                {whatsappBillUrl(completed) ? (
                  <a
                    href={whatsappBillUrl(completed)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-bold text-white hover:brightness-105"
                  >
                    <MessageCircle className="h-5 w-5" /> WhatsApp
                  </a>
                ) : (
                  <span className="flex h-12 items-center justify-center rounded-xl text-center text-sm text-muted-foreground ring-1 ring-dashed ring-border">
                    No customer phone
                  </span>
                )}
              </div>
              <button
                onClick={resetSale}
                autoFocus
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-extrabold text-white shadow-lg"
              >
                <Plus className="h-6 w-6" /> Next sale <Ur className="text-base font-normal">اگلی سیل</Ur>
                <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 font-mono text-xs lg:inline">Enter</kbd>
              </button>
            </div>
          </div>
        </div>
      )}

      <ReceiptModal open={showReceipt} onClose={resetSale} data={receipt} />
    </div>
  );
}

// ---------------- building blocks ----------------

function CategoryChip({ active, onClick, dot, children }: { active: boolean; onClick: () => void; dot: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${
        active ? 'bg-sidebar text-white shadow-md' : 'bg-card text-foreground ring-1 ring-border hover:ring-violet-300'
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden="true" />
      {children}
    </button>
  );
}

function PayTile({
  active,
  onClick,
  icon: Icon,
  en,
  ur,
  gradient,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  en: string;
  ur: string;
  gradient: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`relative flex h-[72px] flex-col items-center justify-center gap-0.5 rounded-2xl transition ${
        active ? `${gradient} text-white shadow-lg` : 'bg-card text-foreground ring-1 ring-border hover:ring-slate-400'
      }`}
    >
      {active && (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/30">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
      <Icon className="h-5 w-5" />
      <span className="text-sm font-extrabold leading-none">{en}</span>
      <Ur className="text-xs leading-none">{ur}</Ur>
    </button>
  );
}

function CustomerRow({ active, onClick, name, sub }: { active: boolean; onClick: () => void; name: string; sub: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left transition ${
        active ? 'bg-fuchsia-50 ring-2 ring-fuchsia-500 dark:bg-fuchsia-950/40' : 'ring-1 ring-border hover:bg-muted'
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fuchsia-600 text-sm font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-foreground">{name}</span>
        <span className="block truncate text-sm text-muted-foreground">{sub}</span>
      </span>
      {active && <Check className="h-5 w-5 text-fuchsia-600" />}
    </button>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value?: string; strong?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-mono font-bold ${strong || 'text-foreground'}`}>{value}</dd>
    </div>
  );
}

function Sheet({
  title,
  ur,
  accent,
  onClose,
  children,
}: {
  title: string;
  ur: string;
  accent: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card shadow-2xl animate-in slide-in-from-bottom-6 duration-200 sm:rounded-3xl">
        <div className={`h-1.5 w-full ${accent}`} />
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-baseline gap-2 text-lg font-extrabold text-foreground">
              {title} <Ur className="text-base font-normal text-muted-foreground">{ur}</Ur>
            </h3>
            <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, ur, children }: { label: string; ur: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline gap-2 text-sm font-bold text-foreground">
        {label} <Ur className="text-xs font-normal text-muted-foreground">{ur}</Ur>
      </span>
      {children}
    </label>
  );
}
