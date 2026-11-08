'use client';

import { useState, useTransition, useMemo, useRef, useEffect, useCallback } from 'react';
import type { Customer, ProductCategory, Brand, PaymentMethod } from '@/lib/types';
import { toRupees } from '@/lib/types';
import { createSale } from '../actions';
import { ReceiptModal, type ReceiptData } from '@/components/ui/receipt-modal';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';

import type { ProductWithStock, CartItem, CompletedSaleInfo, DiscountType } from '@/components/pos/pos-types';
import { PosHeader } from '@/components/pos/pos-header';
import { PosSearchBox, type PosSearchBoxRef } from '@/components/pos/pos-search-box';
import { PosBasketTable } from '@/components/pos/pos-basket-table';
import { PosCheckoutPanel } from '@/components/pos/pos-checkout-panel';
import { PosImeiPicker } from '@/components/pos/pos-imei-picker';
import { PosQuickAddCustomer } from '@/components/pos/pos-quick-add-customer';
import { PosSuccessDialog } from '@/components/pos/pos-success-dialog';
import { PosShortcutsBar } from '@/components/pos/pos-shortcuts-bar';
import type { PosPaymentOption } from '@/components/pos/pos-payment-tiles';

interface PosTerminalProps {
  products: ProductWithStock[];
  customers: Customer[];
  categories: ProductCategory[];
  brands: Brand[];
  shopName: string;
  shopPhone?: string | null;
  shopAddress?: string | null;
}

export function PosTerminal({
  products: initialProducts,
  customers: initialCustomers,
  categories,
  brands,
  shopName,
  shopPhone,
  shopAddress,
}: PosTerminalProps) {
  const [isPending, startTransition] = useTransition();

  // Search Box Ref for imperative focus
  const searchBoxRef = useRef<PosSearchBoxRef>(null);

  // Products and Customers local state
  const [localProducts, setLocalProducts] = useState<ProductWithStock[]>(initialProducts);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Discount State
  const [discountType, setDiscountType] = useState<DiscountType>('pkr');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Payment State
  const [paymentOption, setPaymentOption] = useState<PosPaymentOption>('cash');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [udhaarPaidNow, setUdhaarPaidNow] = useState<number | ''>('');

  // Transaction Idempotency Key
  const [txKey, setTxKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tx_${Date.now()}_${Math.random()}`
  );

  // Modals & Popovers
  const [imeiPickerProduct, setImeiPickerProduct] = useState<ProductWithStock | null>(null);
  const [isQuickAddCustomerOpen, setIsQuickAddCustomerOpen] = useState(false);
  const [isConfirmStartOverOpen, setIsConfirmStartOverOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSaleInfo | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Refocus search helper
  const focusSearch = useCallback(() => {
    setTimeout(() => {
      searchBoxRef.current?.focus();
    }, 60);
  }, []);

  // Sets of currently carted items for fast lookup & validation
  const cartQuantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.product.id, (map.get(item.product.id) || 0) + item.quantity);
    }
    return map;
  }, [cart]);

  const cartImeis = useMemo(() => {
    const set = new Set<string>();
    for (const item of cart) {
      if (item.imei_record_id) {
        set.add(item.imei_record_id);
      }
    }
    return set;
  }, [cart]);

  // Calculations
  const subtotalRupees = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }, [cart]);

  const discountRupees = useMemo(() => {
    if (discountValue <= 0 || subtotalRupees <= 0) return 0;
    if (discountType === 'percent') {
      const calc = Math.round((subtotalRupees * discountValue) / 100);
      return Math.min(subtotalRupees, calc);
    }
    return Math.min(subtotalRupees, discountValue);
  }, [discountType, discountValue, subtotalRupees]);

  const totalRupees = Math.max(0, subtotalRupees - discountRupees);

  // Effective payment calculation
  const effectivePaidRupees = useMemo(() => {
    if (paymentOption === 'cash') {
      return cashReceived === '' ? totalRupees : Number(cashReceived);
    }
    if (paymentOption === 'udhaar') {
      return udhaarPaidNow === '' ? 0 : Math.min(totalRupees, Number(udhaarPaidNow));
    }
    // Online methods (easypaisa, jazzcash, bank_transfer): full payment by default
    return totalRupees;
  }, [paymentOption, cashReceived, udhaarPaidNow, totalRupees]);

  // Validation logic
  const validation = useMemo(() => {
    if (cart.length === 0) {
      return { canComplete: false, reason: 'Add at least one item' };
    }
    if (cart.some((it) => it.unit_price <= 0)) {
      return { canComplete: false, reason: 'All item prices must be greater than zero' };
    }
    if (paymentOption === 'udhaar' && !selectedCustomerId) {
      return { canComplete: false, reason: 'Select a customer for Udhaar' };
    }
    if (paymentOption === 'cash' && cashReceived !== '' && Number(cashReceived) < totalRupees) {
      return { canComplete: false, reason: 'Received amount is less than total' };
    }
    return { canComplete: true, reason: '' };
  }, [cart, paymentOption, selectedCustomerId, cashReceived, totalRupees]);

  // Add Handset or Accessory to Cart
  const handleSelectProduct = useCallback((product: ProductWithStock) => {
    if (product.is_imei_tracked) {
      const availableImeis = (product.imei_records || [])
        .filter((r) => r.status === 'in_stock')
        .filter((r) => !cartImeis.has(r.id));

      if (availableImeis.length === 0) {
        toast.error(`No in-stock IMEIs available for "${product.name}".`);
        return;
      }

      if (availableImeis.length === 1) {
        // Auto-select single available IMEI
        handleAddDirectImei(product, availableImeis[0]);
      } else {
        // Open picker for multiple IMEIs
        setImeiPickerProduct(product);
      }
    } else {
      // Accessory (non-IMEI)
      setCart((prev) => {
        const existingIndex = prev.findIndex((it) => it.product.id === product.id && !it.imei_record_id);
        if (existingIndex >= 0) {
          const current = prev[existingIndex];
          if (current.quantity >= product.stock_quantity) {
            toast.error(`Cannot add more than available stock (${product.stock_quantity})`);
            return prev;
          }
          const updated = [...prev];
          updated[existingIndex] = { ...current, quantity: current.quantity + 1 };
          return updated;
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
      focusSearch();
    }
  }, [cartImeis, focusSearch]);

  // Add specific IMEI directly (e.g. barcode scan or picker)
  const handleAddDirectImei = useCallback(
    (product: ProductWithStock, imei: { id: string; imei_number: string }) => {
      setCart((prev) => {
        if (prev.some((it) => it.imei_record_id === imei.id)) {
          toast.error(`IMEI ...${imei.imei_number.slice(-6)} is already in basket.`);
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
      });
      setImeiPickerProduct(null);
      focusSearch();
    },
    [focusSearch]
  );

  // Quantity and Price updates
  const handleUpdateQuantity = useCallback((index: number, newQty: number) => {
    setCart((prev) => {
      const item = prev[index];
      if (!item || item.imei_record_id) return prev;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      if (newQty > item.product.stock_quantity) {
        toast.error(`Maximum stock available is ${item.product.stock_quantity}`);
        return prev;
      }
      const updated = [...prev];
      updated[index] = { ...item, quantity: newQty };
      return updated;
    });
  }, []);

  const handleUpdatePrice = useCallback((index: number, newPrice: number) => {
    setCart((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const updated = [...prev];
      updated[index] = { ...item, unit_price: Math.max(0, newPrice) };
      return updated;
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    focusSearch();
  }, [focusSearch]);

  const handleClearCart = useCallback(() => {
    setCart([]);
    focusSearch();
  }, [focusSearch]);

  // Reset Sale State
  const resetTerminal = useCallback(() => {
    setCart([]);
    setDiscountValue(0);
    setDiscountType('pkr');
    setPaymentOption('cash');
    setCashReceived('');
    setUdhaarPaidNow('');
    setSelectedCustomerId('');
    setCompletedSale(null);
    setIsSuccessDialogOpen(false);
    setIsReceiptModalOpen(false);
    setReceiptData(null);
    setTxKey(
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `tx_${Date.now()}_${Math.random()}`
    );
    focusSearch();
  }, [focusSearch]);

  // Start Over Handler with Confirmation
  const handleStartOverClick = useCallback(() => {
    if (cart.length > 0) {
      setIsConfirmStartOverOpen(true);
    } else {
      resetTerminal();
    }
  }, [cart.length, resetTerminal]);

  // Complete Sale Submission
  const handleCompleteSale = useCallback(async () => {
    if (!validation.canComplete || isPending) {
      if (validation.reason) {
        toast.error(validation.reason);
      }
      return;
    }

    // Map paymentOption to valid DB PaymentMethod
    let backendPaymentMethod: PaymentMethod = 'cash';
    if (paymentOption === 'easypaisa') backendPaymentMethod = 'easypaisa';
    else if (paymentOption === 'jazzcash') backendPaymentMethod = 'jazzcash';
    else if (paymentOption === 'bank_transfer') backendPaymentMethod = 'bank_transfer';
    else backendPaymentMethod = 'cash';

    const customer = customers.find((c) => c.id === selectedCustomerId);
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const tempInvoiceNumber = `INV-${todayStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload = {
      customer_id: selectedCustomerId || undefined,
      items: cart.map((item) => ({
        product_id: item.product.id,
        imei_record_id: item.imei_record_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      discount: discountRupees,
      payment_method: backendPaymentMethod,
      amount_paid: effectivePaidRupees,
      idempotency_key: txKey,
    };

    // Calculate receipt data
    const cashChange =
      paymentOption === 'cash' && Number(cashReceived) > totalRupees
        ? Number(cashReceived) - totalRupees
        : 0;

    const formattedReceipt: ReceiptData = {
      shopName: shopName || 'ShopFlow Mobile',
      shopPhone: shopPhone || null,
      shopAddress: shopAddress || null,
      invoiceNumber: tempInvoiceNumber,
      date: new Date().toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      customerName: customer?.name || (paymentOption === 'udhaar' ? 'Valued Customer' : 'Walk-in Customer'),
      customerPhone: customer?.phone || null,
      items: cart.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        unit_price: Math.round(item.unit_price * 100),
        total_price: Math.round(item.unit_price * item.quantity * 100),
        imei: item.imei_number || null,
      })),
      subtotal: Math.round(subtotalRupees * 100),
      discount: Math.round(discountRupees * 100),
      totalAmount: Math.round(totalRupees * 100),
      amountPaid: Math.round(Math.min(effectivePaidRupees, totalRupees) * 100),
      cashTendered:
        paymentOption === 'cash' && Number(cashReceived) > totalRupees
          ? Math.round(Number(cashReceived) * 100)
          : undefined,
      cashChange: cashChange > 0 ? Math.round(cashChange * 100) : undefined,
      amountDue: Math.round(Math.max(0, totalRupees - effectivePaidRupees) * 100),
      paymentMethod: (paymentOption === 'udhaar' ? 'UDHAAR' : paymentOption).toUpperCase(),
    };

    const completedInfo: CompletedSaleInfo = {
      invoiceNumber: tempInvoiceNumber,
      total: totalRupees,
      amountPaid: effectivePaidRupees,
      paymentMethod: backendPaymentMethod,
      customerName: customer?.name,
      customerPhone: customer?.phone,
      items: cart.map((it) => ({
        name: it.product.name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        imei: it.imei_number,
      })),
      date: new Date().toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    };

    // Optimistically update local product inventory
    const cartSnapshot = [...cart];
    setLocalProducts((prev) =>
      prev.map((prod) => {
        const soldItem = cartSnapshot.find((ci) => ci.product.id === prod.id);
        if (!soldItem) return prod;
        return {
          ...prod,
          stock_quantity: Math.max(0, prod.stock_quantity - soldItem.quantity),
          imei_records: prod.imei_records?.filter(
            (im) => !cartSnapshot.some((ci) => ci.imei_record_id === im.id)
          ),
        };
      })
    );

    // Show completed sale modal immediately
    setReceiptData(formattedReceipt);
    setCompletedSale(completedInfo);
    setIsSuccessDialogOpen(true);

    startTransition(async () => {
      const res = await createSale(payload);
      if (res.error) {
        setIsSuccessDialogOpen(false);
        setCompletedSale(null);
        setReceiptData(null);
        setLocalProducts(initialProducts); // Rollback
        toast.error(res.error);
      } else if (res.success && res.invoiceNumber) {
        setCompletedSale((prev) => (prev ? { ...prev, invoiceNumber: res.invoiceNumber! } : null));
        setReceiptData((prev) => (prev ? { ...prev, invoiceNumber: res.invoiceNumber! } : null));
      }
    });
  }, [
    validation,
    isPending,
    paymentOption,
    customers,
    selectedCustomerId,
    cart,
    discountRupees,
    effectivePaidRupees,
    txKey,
    cashReceived,
    totalRupees,
    shopName,
    shopPhone,
    shopAddress,
    subtotalRupees,
    initialProducts,
  ]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      // 1. Complete Sale shortcut: Ctrl+Enter or Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCompleteSale();
        return;
      }

      // 2. Search shortcut: F2 or / (when not actively inside another input)
      if (e.key === 'F2') {
        e.preventDefault();
        focusSearch();
        return;
      }

      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        focusSearch();
        return;
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleCompleteSale, focusSearch]);

  return (
    <div className="h-full max-h-full flex flex-col gap-1.5 overflow-hidden select-none bg-background">
      {/* Top Header */}
      <PosHeader
        shopName={shopName}
        hasItems={cart.length > 0}
        onStartOver={handleStartOverClick}
      />

      {/* Persistent Search Bar Row */}
      <div className="shrink-0">
        <PosSearchBox
          ref={searchBoxRef}
          products={localProducts}
          categories={categories}
          brands={brands}
          cartQuantities={cartQuantities}
          cartImeis={cartImeis}
          onSelectProduct={handleSelectProduct}
          onAddDirectImei={handleAddDirectImei}
        />
      </div>

      {/* Main Two-Column Viewport (Fixed Height, No Page Scroll) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-2">
        {/* Left Column: Basket Table (60-65% width on desktop) */}
        <div className="md:col-span-7 xl:col-span-8 flex flex-col min-h-0 h-full">
          <PosBasketTable
            cart={cart}
            brands={brands}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdatePrice={handleUpdatePrice}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onFocusSearch={focusSearch}
          />
        </div>

        {/* Right Column: Persistent Checkout Panel (35-40% width) */}
        <div className="md:col-span-5 xl:col-span-4 flex flex-col min-h-0 h-full">
          <PosCheckoutPanel
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={(id) => {
              setSelectedCustomerId(id);
              focusSearch();
            }}
            onOpenQuickAddCustomer={() => setIsQuickAddCustomerOpen(true)}
            subtotalRupees={subtotalRupees}
            discountRupees={discountRupees}
            discountType={discountType}
            discountValue={discountValue}
            onDiscountChange={(val, type) => {
              setDiscountValue(val);
              setDiscountType(type);
            }}
            totalRupees={totalRupees}
            paymentOption={paymentOption}
            onSelectPaymentOption={(opt) => {
              setPaymentOption(opt);
              if (opt === 'cash') {
                setCashReceived(totalRupees);
              }
            }}
            cashReceived={cashReceived}
            onChangeCashReceived={setCashReceived}
            udhaarPaidNow={udhaarPaidNow}
            onChangeUdhaarPaidNow={setUdhaarPaidNow}
            isPending={isPending}
            canComplete={validation.canComplete}
            disabledReason={validation.reason}
            onCompleteSale={handleCompleteSale}
          />
        </div>
      </div>

      {/* Bottom Shortcuts Strip */}
      <PosShortcutsBar onSearchFocus={focusSearch} />

      {/* Modals & Dialogs */}

      {/* 1. Multi-IMEI Picker Modal */}
      {imeiPickerProduct && (
        <PosImeiPicker
          product={imeiPickerProduct}
          cartImeis={cartImeis}
          onSelectImei={handleAddDirectImei}
          onClose={() => {
            setImeiPickerProduct(null);
            focusSearch();
          }}
        />
      )}

      {/* 2. Quick Add Customer Modal */}
      <PosQuickAddCustomer
        open={isQuickAddCustomerOpen}
        onClose={() => {
          setIsQuickAddCustomerOpen(false);
          focusSearch();
        }}
        onCustomerCreated={(newCust) => {
          setCustomers((prev) => [newCust, ...prev]);
          setSelectedCustomerId(newCust.id);
          focusSearch();
        }}
      />

      {/* 3. Confirm Start Over Dialog */}
      <ConfirmationDialog
        open={isConfirmStartOverOpen}
        onClose={() => setIsConfirmStartOverOpen(false)}
        onConfirm={() => {
          setIsConfirmStartOverOpen(false);
          resetTerminal();
        }}
        title="Start Fresh Sale?"
        description="This will clear all items in the current basket. This cannot be undone."
        confirmLabel="Yes, Clear Basket"
        cancelLabel="Keep Basket"
        variant="danger"
      />

      {/* 4. Sale Success Dialog */}
      <PosSuccessDialog
        open={isSuccessDialogOpen}
        sale={completedSale}
        shopName={shopName}
        onPrintReceipt={() => {
          setIsSuccessDialogOpen(false);
          setIsReceiptModalOpen(true);
        }}
        onNewSale={() => {
          setIsSuccessDialogOpen(false);
          resetTerminal();
        }}
      />

      {/* 5. Thermal Receipt Modal */}
      <ReceiptModal
        open={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          resetTerminal();
        }}
        data={receiptData}
      />
    </div>
  );
}
