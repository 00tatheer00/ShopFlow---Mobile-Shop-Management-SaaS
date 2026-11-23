import { EmptyBlock, IconChip, PageHeader, type Tone } from '@/components/ui/kit';
import { Ur } from '@/components/ui/urdu';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Package, AlertTriangle, PackageX, Wallet } from 'lucide-react';
import { fetchAllRows, sanitizeSearch } from '@/lib/supabase/queries';
import { formatPKR } from '@/lib/types';
import { requireShopAccess, hasPermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ProductsTable } from './products-table';
import { ProductFilters } from './product-filters';

export const metadata: Metadata = { title: 'Products' };

interface SearchParams {
  search?: string;
  category?: string;
  brand?: string;
  status?: string;
  page?: string;
  adjustStock?: string;
}

export default async function ProductsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireShopAccess();
  const supabase = await createClient();
  const searchParams = await props.searchParams;
  const canCreate = hasPermission(user.role, 'products:create');
  // Cost prices are owner/manager information
  const canSeeCost = hasPermission(user.role, 'products:edit');

  const search = sanitizeSearch(searchParams.search);
  const categoryFilter = searchParams.category || '';
  const brandFilter = searchParams.brand || '';
  const statusFilter = searchParams.status || 'active';
  const page = Math.max(1, Math.floor(Number(searchParams.page)) || 1);
  const perPage = 20;

  // Build product query
  let query = supabase
    .from('products')
    .select(`
      id, name, model, is_imei_tracked, sale_price, purchase_price,
      stock_quantity, low_stock_threshold, is_active, created_at,
      product_categories(id, name),
      brands(id, name)
    `, { count: 'exact' })
    .eq('shop_id', user.shop_id!)
    .order('created_at', { ascending: false });

  if (statusFilter === 'active') {
    query = query.eq('is_active', true);
  } else if (statusFilter === 'inactive') {
    query = query.eq('is_active', false);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }
  if (categoryFilter) {
    query = query.eq('category_id', categoryFilter);
  }
  if (brandFilter) {
    query = query.eq('brand_id', brandFilter);
  }

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  // Fetch product list, categories, and brands concurrently in single round-trip
  const [{ data: products, count }, { data: categories }, { data: brands }, stockRows] = await Promise.all([
    query,
    supabase
      .from('product_categories')
      .select('id, name')
      .eq('shop_id', user.shop_id!)
      .order('name'),
    supabase
      .from('brands')
      .select('id, name')
      .eq('shop_id', user.shop_id!)
      .order('name'),
    // Whole-shop stock summary (all active items, not just this page)
    fetchAllRows<{ stock_quantity: number; low_stock_threshold: number; purchase_price: number }>(() =>
      supabase
        .from('products')
        .select('stock_quantity, low_stock_threshold, purchase_price')
        .eq('shop_id', user.shop_id!)
        .eq('is_active', true)
        .order('id', { ascending: true })
    ),
  ]);

  const summary = stockRows.reduce(
    (acc, r) => {
      acc.items += 1;
      acc.units += r.stock_quantity;
      if (r.stock_quantity <= 0) acc.out += 1;
      else if (r.stock_quantity <= r.low_stock_threshold) acc.low += 1;
      acc.value += r.stock_quantity * (r.purchase_price || 0);
      return acc;
    },
    { items: 0, units: 0, low: 0, out: 0, value: 0 }
  );

  const totalPages = Math.ceil((count || 0) / perPage);

  // If specific product requested for stock adjustment, ensure it is available
  let targetAdjustProduct = null;
  if (searchParams.adjustStock) {
    const existing = (products || []).find((p) => p.id === searchParams.adjustStock);
    if (existing) {
      targetAdjustProduct = {
        ...existing,
        category_name: (existing.product_categories as unknown as { name: string })?.name || null,
        brand_name: (existing.brands as unknown as { name: string })?.name || null,
      };
    } else {
      const { data: specific } = await supabase
        .from('products')
        .select(`
          id, name, model, is_imei_tracked, sale_price, purchase_price,
          stock_quantity, low_stock_threshold, is_active, created_at,
          product_categories(id, name),
          brands(id, name)
        `)
        .eq('id', searchParams.adjustStock)
        .eq('shop_id', user.shop_id!)
        .maybeSingle();

      if (specific) {
        targetAdjustProduct = {
          ...specific,
          category_name: (specific.product_categories as unknown as { name: string })?.name || null,
          brand_name: (specific.brands as unknown as { name: string })?.name || null,
        };
      }
    }
  }

  const formattedProducts = (products || []).map((p) => ({
    ...p,
    purchase_price: canSeeCost ? p.purchase_price : 0,
    category_name: (p.product_categories as unknown as { name: string })?.name || null,
    brand_name: (p.brands as unknown as { name: string })?.name || null,
  }));

  // Prepend target product if not already in list
  if (targetAdjustProduct && !formattedProducts.some((p) => p.id === targetAdjustProduct.id)) {
    formattedProducts.unshift(targetAdjustProduct);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Products"
        ur="مال / اسٹاک"
        icon={Package}
        tone="sky"
        description={<>All items in your shop, their price and stock</>}
        actions={
        <>
          {canCreate && (
            <Link
              href="/products/new"
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Link>
          )}
        </>
      }
      />

      {/* Stock summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile icon={Package} tone="sky" en="Items" ur="کل آئٹم" value={String(summary.items)} note={`${summary.units.toLocaleString()} units in shop`} />
        <SummaryTile icon={AlertTriangle} tone="amber" en="Low stock" ur="کم مال" value={String(summary.low)} note="Order more soon" />
        <SummaryTile icon={PackageX} tone="rose" en="Out of stock" ur="مال ختم" value={String(summary.out)} note="Cannot be sold now" />
        {canSeeCost ? (
          <SummaryTile icon={Wallet} tone="violet" en="Stock value" ur="مال کی قیمت" value={formatPKR(summary.value)} note="At purchase cost" />
        ) : (
          <SummaryTile icon={Package} tone="slate" en="Categories" ur="قسمیں" value={String((categories || []).length)} note="Groups of items" />
        )}
      </div>

      {/* Filters */}
      <ProductFilters
        categories={categories || []}
        brands={brands || []}
        currentSearch={search}
        currentCategory={categoryFilter}
        currentBrand={brandFilter}
        currentStatus={statusFilter}
      />

      {/* Products Table */}
      {formattedProducts.length > 0 ? (
        <ProductsTable
          products={formattedProducts}
          userRole={user.role}
          currentPage={page}
          totalPages={totalPages}
          initialAdjustProduct={targetAdjustProduct}
          searchParams={{
            search: search || undefined,
            category: categoryFilter || undefined,
            brand: brandFilter || undefined,
            status: statusFilter !== 'active' ? statusFilter : undefined,
            page: String(page),
            adjustStock: searchParams.adjustStock || undefined,
          }}
        />
      ) : (
        <EmptyBlock
          icon={Package}
          tone="sky"
          title={search || categoryFilter || brandFilter ? 'No items match your search' : 'No items yet'}
          ur={search || categoryFilter || brandFilter ? 'کوئی آئٹم نہیں ملا' : 'ابھی کوئی مال درج نہیں'}
          text={search || categoryFilter || brandFilter ? 'Try a different name or clear the filters.' : 'Add your first item to start selling.'}
          action={
            canCreate && !search && !categoryFilter && !brandFilter ? (
              <Link href="/products/new" className="btn btn-primary">
                <Plus className="h-4 w-4" /> Add first item
              </Link>
            ) : undefined
          }
        />
      )}
    </div>
  );
}

function SummaryTile({
  icon,
  tone,
  en,
  ur,
  value,
  note,
}: {
  icon: React.ElementType;
  tone: Tone;
  en: string;
  ur: string;
  value: string;
  note: string;
}) {
  return (
    <div className="panel flex items-center gap-3 p-4">
      <IconChip icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="flex items-baseline gap-1.5 text-sm font-semibold text-foreground">
          {en} <Ur className="text-xs font-normal text-muted-foreground">{ur}</Ur>
        </p>
        <p className="truncate font-mono text-xl font-bold tabular-nums text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}
