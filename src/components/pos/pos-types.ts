import type { Customer, Product, ProductCategory, Brand, PaymentMethod } from '@/lib/types';

export interface ProductWithStock extends Product {
  imei_records?: { id: string; imei_number: string; status: string }[];
}

export interface CartItem {
  product: ProductWithStock;
  quantity: number;
  unit_price: number; // in rupees
  imei_record_id?: string;
  imei_number?: string;
}

export type DiscountType = 'pkr' | 'percent';

export interface CompletedSaleInfo {
  saleId?: string;
  invoiceNumber: string;
  total: number; // in rupees
  amountPaid: number; // in rupees
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  items: {
    name: string;
    quantity: number;
    unit_price: number;
    imei?: string;
  }[];
  date: string;
}
