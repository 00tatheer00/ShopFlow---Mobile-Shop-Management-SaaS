import type { Product } from '@/lib/types';

/** Product as loaded for the POS, with its in-stock IMEI records. */
export interface ProductWithStock extends Product {
  imei_records?: { id: string; imei_number: string; status: string }[];
}
