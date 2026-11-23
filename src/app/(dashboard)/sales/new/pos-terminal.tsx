'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  ArrowLeft,
  History,
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
  UserPlus,
  RotateCcw,
  Printer,
  MessageCircle,
  Percent,
  PackageOpen,
} from 'lucide-react';
import type { Customer, ProductCategory, Brand, PaymentMethod } from '@/lib/types';
import Link from 'next/link';
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

    // Stock check uses the latest rendered cart (best effort for the message);
    // the update itself works on `prev`, so fast double-taps never create a
    // duplicate line or exceed stock.
    const existing = cart.find((i) => i.product.id === product.id && !i.imei_record_id);
    if (existing && existing.quantity >= product.stock_quantity) {
      toast.error(`Only ${product.stock_quantity} in stock`, { description: product.name });
      return;
    }
    setCart((prev) => {
      const line = prev.find((i) => i.product.id === product.id && !i.imei_record_id);
      if (!line) {
        return [...prev, { key: `p-${product.id}`, product, quantity: 1, unit_price: toRupees(product.sale_price) }];
      }
      if (line.quantity >= product.stock_quantity) return prev;
      return prev.map((i) => (i.key === line.key ? { ...i, quantity: i.quantity + 1 } : i));
    });
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
  const methodLabel =
    payMode === 'online' ? ONLINE_METHODS.find((m) => m.id === onlineMethod)?.label || 'Online' : payMode === 'cash' ? 'Cash' : 'Udhaar';

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/50">
      {/* ================= Top bar ================= */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-2 sm:px-4">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('shopflow:toggle-sidebar'))}
          className="icon-btn lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" className="icon-btn hidden lg:inline-flex" aria-label="Back to dashboard" title="Back to dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 leading-tight">
          <h1 className="flex items-baseline gap-2 text-base font-bold text-foreground">
            New Sale <Ur className="text-sm font-normal text-muted-foreground">{UR.newSale}</Ur>
          </h1>
          <p className="truncate text-xs text-muted-foreground">{shopName}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-3 text-xs text-muted-foreground xl:flex">
            <span className="flex items-center gap-1.5">
              <Kbd>F2</Kbd> Search
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> Charge
            </span>
          </div>
          <Link href="/sales" className="btn btn-sm btn-ghost hidden sm:inline-flex">
            <History className="h-4 w-4" /> Sales
          </Link>
        </div>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="flex shrink-0 items-start justify-between gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200"
        >
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </span>
          <button onClick={() => setErrorMessage(null)} className="rounded p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* ================= Catalogue ================= */}
        <section
          className={`min-w-0 flex-1 flex-col lg:flex ${mobileView === 'items' ? 'flex' : 'hidden'}`}
          aria-label="Items"
        >
          <div className="shrink-0 space-y-3 px-3 pb-3 pt-3 sm:px-5 sm:pt-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="search"
                autoComplete="off"
                placeholder="Search item or model, or scan IMEI / barcode"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchEnter();
                  }
                }}
                className="h-12 w-full rounded-xl border border-input bg-card pl-11 pr-12 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12"
                aria-label="Search items"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 lg:block">
                  <Kbd>F2</Kbd>
                </span>
              )}
            </div>

            {categories.length > 0 && (
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="tablist" aria-label="Categories">
                <CategoryTab active={!selectedCategory} onClick={() => setSelectedCategory('')} count={inStockProducts.length}>
                  All items
                </CategoryTab>
                {categories.map((c) => {
                  const count = inStockProducts.filter((p) => p.category_id === c.id).length;
                  if (count === 0) return null;
                  return (
                    <CategoryTab key={c.id} active={selectedCategory === c.id} onClick={() => setSelectedCategory(c.id)} count={count}>
                      {c.name}
                    </CategoryTab>
                  );
                })}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-28 sm:px-5 lg:pb-5">
            {filteredProducts.length === 0 ? (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-sm ring-1 ring-border">
                  <PackageOpen className="h-7 w-7" />
                </span>
                <p className="mt-3 font-semibold text-foreground">
                  {inStockProducts.length === 0 ? 'No items in stock' : `No item matches “${search}”`}
                </p>
                <Ur className="text-sm text-muted-foreground">
                  {inStockProducts.length === 0 ? 'پہلے مال خریداری میں مال درج کریں' : 'کوئی آئٹم نہیں ملا'}
                </Ur>
                {inStockProducts.length === 0 && (
                  <Link href="/purchases/new" className="btn btn-primary mt-4">
                    <Plus className="h-4 w-4" /> Add stock
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredProducts.map((p) => {
                  const inCart = cartQty.get(p.id) || 0;
                  const low = p.stock_quantity <= p.low_stock_threshold;
                  const category = categories.find((c) => c.id === p.category_id)?.name;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '120px' }}
                      className={`group relative flex min-h-[120px] flex-col rounded-xl border bg-card p-3 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition hover:shadow-md active:scale-[0.98] ${
                        inCart > 0 ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{p.name}</span>
                        {inCart > 0 && (
                          <span className="animate-pop flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                            {inCart}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 truncate text-[13px] text-muted-foreground">
                        {[p.model, category].filter(Boolean).join(' · ') || ' '}
                      </span>
                      <span className="mt-auto flex items-end justify-between gap-2 pt-3">
                        <span className="whitespace-nowrap font-mono text-base font-bold tabular-nums text-foreground">
                          {formatPKR(p.sale_price)}
                        </span>
                        <span
                          className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                            low
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {p.is_imei_tracked ? `${p.stock_quantity} phone${p.stock_quantity === 1 ? '' : 's'}` : `${p.stock_quantity} in stock`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ================= Order panel ================= */}
        <aside
          className={`min-h-0 w-full flex-col border-l border-border bg-card lg:flex lg:w-[400px] xl:w-[440px] ${
            mobileView === 'bill' ? 'flex' : 'hidden'
          }`}
          aria-label="Current sale"
        >
          {/* header */}
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-4">
            <button type="button" onClick={() => setMobileView('items')} className="icon-btn lg:hidden" aria-label="Back to items">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="flex items-baseline gap-2 text-base font-bold text-foreground">
              Current sale <Ur className="text-sm font-normal text-muted-foreground">{UR.bill}</Ur>
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </span>
            {cart.length > 0 && (
              <button type="button" onClick={() => setClearOpen(true)} className="btn btn-sm btn-ghost ml-auto hover:!text-rose-600">
                <RotateCcw className="h-4 w-4" /> Clear
              </button>
            )}
          </div>

          {/* customer */}
          <div className="shrink-0 border-b border-border px-3 py-2.5 sm:px-4">
            <button
              type="button"
              onClick={() => {
                setCustomerQuery('');
                setAddingCustomer(false);
                setCustomerPickerOpen(true);
              }}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left transition hover:bg-muted/60 ${
                due > 0 && !customerId ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/30' : 'border-border'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  selectedCustomer ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {selectedCustomer ? selectedCustomer.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {selectedCustomer ? selectedCustomer.phone : 'Tap to choose or add a customer'}
                </span>
              </span>
              <span className="text-xs font-semibold text-primary">{selectedCustomer ? 'Change' : 'Add'}</span>
            </button>
          </div>

          {/* line items */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex h-full min-h-[140px] flex-col items-center justify-center px-6 text-center">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-semibold text-foreground">No items yet</p>
                <p className="text-xs text-muted-foreground">Tap an item or scan an IMEI to add it</p>
                <Ur className="text-sm text-muted-foreground">آئٹم پر ٹیپ کریں</Ur>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {cart.map((item) => (
                  <li key={item.key} className="px-3 py-3 sm:px-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{item.product.name}</p>
                        {item.imei_number ? (
                          <p className="font-mono text-xs text-muted-foreground">IMEI {item.imei_number}</p>
                        ) : (
                          item.product.model && <p className="truncate text-xs text-muted-foreground">{item.product.model}</p>
                        )}
                      </div>
                      <span className="whitespace-nowrap font-mono text-sm font-bold tabular-nums text-foreground">
                        {money(item.unit_price * item.quantity)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {item.imei_record_id ? (
                        <span className="inline-flex h-9 items-center rounded-lg bg-muted px-3 text-xs font-semibold text-muted-foreground">Qty 1</span>
                      ) : (
                        <div className="inline-flex h-9 items-center rounded-lg border border-border">
                          <button type="button" onClick={() => changeQty(item.key, -1)} className="flex h-full w-9 items-center justify-center rounded-l-lg hover:bg-muted" aria-label="One less">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-8 text-center font-mono text-sm font-bold tabular-nums">{item.quantity}</span>
                          <button type="button" onClick={() => changeQty(item.key, 1)} className="flex h-full w-9 items-center justify-center rounded-r-lg hover:bg-muted" aria-label="One more">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">×</span>
                      <label className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                        <span className="text-xs text-muted-foreground">Rs</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={item.unit_price || ''}
                          onChange={(e) => changePrice(item.key, e.target.value)}
                          className="w-20 bg-transparent font-mono text-sm font-semibold tabular-nums text-foreground focus:outline-none"
                          aria-label={`Price for ${item.product.name}`}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="icon-btn ml-auto h-9 w-9 hover:!bg-rose-50 hover:!text-rose-600 dark:hover:!bg-rose-950/40"
                        aria-label={`Remove ${item.product.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* totals & payment */}
          <div className="shrink-0 space-y-3 border-t border-border bg-card px-3 py-3 sm:px-4">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="font-mono tabular-nums">{money(subtotal)}</dd>
              </div>
              {showDiscount ? (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="flex items-center gap-1.5">
                    <div className="flex overflow-hidden rounded-lg border border-border">
                      {(['rs', 'percent'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setDiscountType(t)}
                          className={`flex h-8 w-9 items-center justify-center text-xs font-bold ${
                            discountType === t ? 'bg-foreground text-background' : 'bg-card text-muted-foreground'
                          }`}
                          aria-label={t === 'rs' ? 'Rupees' : 'Percent'}
                        >
                          {t === 'rs' ? 'Rs' : <Percent className="h-3.5 w-3.5" />}
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
                      className="h-8 w-24 rounded-lg border border-border bg-card px-2 text-right font-mono text-sm font-semibold focus:border-primary focus:outline-none"
                    />
                  </dd>
                </div>
              ) : (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd>
                    <button
                      type="button"
                      onClick={() => setShowDiscount(true)}
                      disabled={cart.length === 0}
                      className="text-sm font-semibold text-primary disabled:text-muted-foreground"
                    >
                      + Add
                    </button>
                  </dd>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <dt>Discount applied</dt>
                  <dd className="font-mono tabular-nums">− {money(discount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-dashed border-border pt-2">
                <dt className="text-base font-bold text-foreground">
                  Total <Ur className="text-sm font-normal text-muted-foreground">{UR.total}</Ur>
                </dt>
                <dd className="font-mono text-2xl font-bold tabular-nums text-foreground">{money(total)}</dd>
              </div>
            </dl>

            {/* payment method */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Payment method">
              <PayOption active={payMode === 'cash'} onClick={() => { setPayMode('cash'); setReceivedInput(''); }} icon={Banknote} en="Cash" ur={UR.cash} />
              <PayOption active={payMode === 'online'} onClick={() => { setPayMode('online'); setReceivedInput(''); }} icon={Smartphone} en="Online" ur={UR.onlinePay} />
              <PayOption
                active={payMode === 'udhaar'}
                onClick={() => {
                  setPayMode('udhaar');
                  setReceivedInput('');
                  if (!customerId) setCustomerPickerOpen(true);
                }}
                icon={Wallet}
                en="Udhaar"
                ur={UR.credit}
              />
            </div>

            {payMode === 'online' && (
              <div className="flex gap-1.5">
                {ONLINE_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setOnlineMethod(m.id)}
                    className={`h-9 flex-1 rounded-lg border text-sm font-semibold transition ${
                      onlineMethod === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {payMode !== 'online' && cart.length > 0 && (
              <div className="space-y-2">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    {payMode === 'cash' ? 'Cash received' : 'Paid now'}{' '}
                    <Ur className="text-xs">{payMode === 'cash' ? 'گاہک نے دیے' : 'ابھی دیے'}</Ur>
                  </span>
                  <span className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rs</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder={payMode === 'cash' ? String(total) : '0'}
                      value={receivedInput}
                      onChange={(e) => setReceivedInput(e.target.value)}
                      className="h-10 w-36 rounded-lg border border-border bg-card pl-8 pr-2.5 text-right font-mono text-base font-semibold tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    />
                  </span>
                </label>
                {payMode === 'cash' && (
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setReceivedInput('')} className="h-8 flex-1 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted">
                      Exact
                    </button>
                    {[500, 1000, 5000].map((note) => (
                      <button
                        key={note}
                        type="button"
                        onClick={() => setReceivedInput(String((Number(receivedInput) || 0) + note))}
                        className="h-8 flex-1 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        +{note.toLocaleString()}
                      </button>
                    ))}
                  </div>
                )}
                {change > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <span>
                      Give back <Ur className="text-xs font-normal">{UR.change}</Ur>
                    </span>
                    <span className="font-mono tabular-nums">{money(change)}</span>
                  </div>
                )}
                {due > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                    <span>
                      Goes to udhaar <Ur className="text-xs font-normal">{UR.remaining}</Ur>
                    </span>
                    <span className="font-mono tabular-nums">{money(due)}</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={requestCheckout}
              disabled={cart.length === 0 || isSaving}
              className="flex h-14 w-full items-center justify-between rounded-xl bg-primary px-5 text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.99] disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              <span className="flex items-center gap-2 text-base font-bold">
                <Check className="h-5 w-5" /> Charge
                <Ur className="text-sm font-normal opacity-80">{UR.completeSale}</Ur>
              </span>
              <span className="font-mono text-lg font-bold tabular-nums">{money(total)}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ================= Phone: bottom bar ================= */}
      {mobileView === 'items' && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-2 shadow-[0_-4px_16px_rgb(0_0_0/0.06)] lg:hidden">
          <button
            type="button"
            onClick={() => setMobileView('bill')}
            disabled={cart.length === 0}
            className="flex h-13 w-full items-center justify-between rounded-xl bg-primary px-4 text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/20 px-2 text-xs">{itemCount}</span>
              View sale
            </span>
            <span className="flex items-center gap-1 font-mono text-base font-bold tabular-nums">
              {money(total)} <ChevronRight className="h-5 w-5" />
            </span>
          </button>
        </div>
      )}

      {/* ================= IMEI picker ================= */}
      {imeiProduct && (
        <Sheet title="Choose phone (IMEI)" ur={UR.chooseImei} onClose={() => setImeiProduct(null)}>
          <p className="text-sm text-muted-foreground">{imeiProduct.name}</p>
          <input
            type="search"
            inputMode="numeric"
            autoFocus
            placeholder="Type last digits of IMEI…"
            value={imeiQuery}
            onChange={(e) => setImeiQuery(e.target.value)}
            className="input-lg mt-3"
          />
          <div className="mt-3 max-h-[50vh] divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {(imeiProduct.imei_records || [])
              .filter((r) => r.status === 'in_stock' && !cart.some((c) => c.imei_record_id === r.id))
              .filter((r) => !imeiQuery || r.imei_number.includes(imeiQuery.replace(/\D/g, '')))
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addProduct(imeiProduct, r)}
                  className="flex h-12 w-full items-center justify-between px-3 font-mono text-[15px] hover:bg-muted"
                >
                  <span>
                    {r.imei_number.slice(0, -6)}
                    <strong className="text-foreground">{r.imei_number.slice(-6)}</strong>
                  </span>
                  <Plus className="h-4 w-4 text-primary" />
                </button>
              ))}
          </div>
        </Sheet>
      )}

      {/* ================= Customer picker ================= */}
      {customerPickerOpen && (
        <Sheet title="Customer" ur="گاہک" onClose={() => setCustomerPickerOpen(false)}>
          {addingCustomer ? (
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <Field label="Name" ur="نام">
                <input name="name" required autoFocus placeholder="e.g. Asad Khan" className="input-lg" />
              </Field>
              <Field label="Mobile number" ur="موبائل نمبر">
                <input name="phone" required inputMode="tel" placeholder="03001234567" className="input-lg font-mono" />
              </Field>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setAddingCustomer(false)} className="btn btn-outline flex-1">
                  Back
                </button>
                <button type="submit" disabled={isAddingCustomer} className="btn btn-primary flex-1">
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
                <button type="button" onClick={() => setAddingCustomer(true)} className="btn btn-primary h-12">
                  <UserPlus className="h-5 w-5" />
                  <span className="hidden sm:inline">New</span>
                </button>
              </div>
              <div className="mt-3 max-h-[55vh] divide-y divide-border overflow-y-auto rounded-xl border border-border">
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
                  <button type="button" onClick={() => setAddingCustomer(true)} className="w-full py-6 text-center text-sm font-semibold text-primary">
                    Not found — add new customer
                  </button>
                )}
              </div>
            </>
          )}
        </Sheet>
      )}

      {/* ================= Clear sale ================= */}
      {clearOpen && (
        <Sheet title="Clear this sale?" ur="بل صاف کریں؟" onClose={() => setClearOpen(false)}>
          <p className="text-sm text-muted-foreground">All {itemCount} items will be removed. This cannot be undone.</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setClearOpen(false)} className="btn btn-outline flex-1">
              Keep items
            </button>
            <button
              onClick={() => {
                setClearOpen(false);
                resetSale();
                toast('Sale cleared');
              }}
              className="btn btn-danger flex-1"
            >
              Clear sale
            </button>
          </div>
        </Sheet>
      )}

      {/* ================= Confirm ================= */}
      {confirmOpen && (
        <Sheet title="Confirm sale" ur="سیل کی تصدیق" onClose={() => !isSaving && setConfirmOpen(false)}>
          <div className="rounded-xl bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Amount to collect</p>
            <p className="font-mono text-4xl font-bold tabular-nums text-foreground">{money(total)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {itemCount} item{itemCount === 1 ? '' : 's'} · {selectedCustomer?.name || 'Walk-in customer'}
            </p>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <SummaryRow label="Payment" value={methodLabel} />
            {discount > 0 && <SummaryRow label="Discount" value={`− ${money(discount)}`} />}
            {payMode !== 'online' && <SummaryRow label={payMode === 'cash' ? 'Cash received' : 'Paid now'} value={money(received)} />}
            {change > 0 && <SummaryRow label="Give back" value={money(change)} strong="text-emerald-600 dark:text-emerald-400" />}
            {due > 0 && <SummaryRow label="Goes to udhaar" value={money(due)} strong="text-amber-600 dark:text-amber-400" />}
          </dl>
          <div className="mt-5 flex gap-2">
            <button disabled={isSaving} onClick={() => setConfirmOpen(false)} className="btn btn-outline h-12 flex-1">
              Back
            </button>
            <button onClick={confirmSale} disabled={isSaving} autoFocus className="btn btn-primary h-12 flex-[2] text-base">
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" /> Confirm &amp; save
                </>
              )}
            </button>
          </div>
        </Sheet>
      )}

      {/* ================= Success ================= */}
      {completed && !showReceipt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-2xl bg-card p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-2xl">
            <div className="text-center">
              <span className="animate-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <Check className="h-9 w-9" strokeWidth={3} />
              </span>
              <p className="mt-3 text-xl font-bold text-foreground">Sale complete</p>
              <Ur className="text-muted-foreground">سیل مکمل ہو گئی</Ur>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{completed.invoiceNumber}</p>
            </div>

            <dl className="mt-5 space-y-2 rounded-xl border border-border p-4 text-sm">
              <SummaryRow label="Total" value={money(completed.total)} strong="text-foreground text-base" />
              <SummaryRow label="Payment" value={completed.method} />
              {completed.change > 0 && <SummaryRow label="Give back" value={money(completed.change)} strong="text-emerald-600 dark:text-emerald-400 text-base" />}
              {completed.due > 0 && <SummaryRow label="Added to udhaar" value={money(completed.due)} strong="text-amber-600 dark:text-amber-400" />}
            </dl>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setShowReceipt(true)} className="btn btn-outline">
                <Printer className="h-4 w-4" /> Print receipt
              </button>
              {whatsappBillUrl(completed) ? (
                <a href={whatsappBillUrl(completed)!} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                  <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
                </a>
              ) : (
                <button disabled className="btn btn-outline" title="Choose a customer with a phone number to send on WhatsApp">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </button>
              )}
            </div>
            <button onClick={resetSale} autoFocus className="btn btn-primary mt-2 h-12 w-full text-base">
              <Plus className="h-5 w-5" /> New sale <Ur className="text-sm font-normal opacity-80">اگلی سیل</Ur>
              <span className="ml-1 hidden lg:inline">
                <Kbd tone="dark">Enter</Kbd>
              </span>
            </button>
          </div>
        </div>
      )}

      <ReceiptModal open={showReceipt} onClose={resetSale} data={receipt} />
    </div>
  );
}

// ---------------- building blocks ----------------

function Kbd({ children, tone = 'light' }: { children: React.ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <kbd
      className={`inline-flex min-w-6 items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
        tone === 'dark' ? 'border-white/25 bg-white/15 text-white' : 'border-border bg-muted text-muted-foreground'
      }`}
    >
      {children}
    </kbd>
  );
}

function CategoryTab({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${
        active ? 'bg-foreground text-background' : 'bg-card text-foreground ring-1 ring-border hover:bg-muted'
      }`}
    >
      {children}
      <span className={`text-xs ${active ? 'opacity-70' : 'text-muted-foreground'}`}>{count}</span>
    </button>
  );
}

function PayOption({
  active,
  onClick,
  icon: Icon,
  en,
  ur,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  en: string;
  ur: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition ${
        active ? 'bg-card font-bold text-foreground shadow-sm ring-1 ring-border' : 'font-medium text-muted-foreground hover:text-foreground'
      }`}
    >
      <span className="flex items-center gap-1.5">
        <Icon className={`h-4 w-4 ${active ? 'text-primary' : ''}`} />
        {en}
      </span>
      <Ur className="text-[11px] leading-none">{ur}</Ur>
    </button>
  );
}

function CustomerRow({ active, onClick, name, sub }: { active: boolean; onClick: () => void; name: string; sub: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-14 w-full items-center gap-3 px-3 text-left transition hover:bg-muted ${active ? 'bg-primary/5' : ''}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
      {active && <Check className="h-5 w-5 text-primary" />}
    </button>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value?: string; strong?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-mono font-semibold tabular-nums ${strong || 'text-foreground'}`}>{value}</dd>
    </div>
  );
}

function Sheet({ title, ur, onClose, children }: { title: string; ur: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-baseline gap-2 text-lg font-bold text-foreground">
            {title} <Ur className="text-base font-normal text-muted-foreground">{ur}</Ur>
          </h3>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, ur, children }: { label: string; ur: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">
        {label} <Ur className="text-xs font-normal text-muted-foreground">{ur}</Ur>
      </span>
      {children}
    </label>
  );
}
