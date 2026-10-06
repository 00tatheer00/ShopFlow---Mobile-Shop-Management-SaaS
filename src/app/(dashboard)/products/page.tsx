import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
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
}

export default async function ProductsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireShopAccess();
  const supabase = await createClient();
  const searchParams = await props.searchParams;
  const canCreate = hasPermission(user.role, 'products:create');

  const search = searchParams.search || '';
  const categoryFilter = searchParams.category || '';
  const brandFilter = searchParams.brand || '';
  const statusFilter = searchParams.status || 'active';
  const page = Number(searchParams.page) || 1;
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
  const [{ data: products, count }, { data: categories }, { data: brands }] = await Promise.all([
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
  ]);

  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Products
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your product catalog — {count ?? 0} product{count !== 1 ? 's' : ''}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
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
      {products && products.length > 0 ? (
        <ProductsTable
          products={products.map((p) => ({
            ...p,
            category_name: (p.product_categories as unknown as { name: string })?.name || null,
            brand_name: (p.brands as unknown as { name: string })?.name || null,
          }))}
          userRole={user.role}
          currentPage={page}
          totalPages={totalPages}
          searchParams={{
            search: search || undefined,
            category: categoryFilter || undefined,
            brand: brandFilter || undefined,
            status: statusFilter !== 'active' ? statusFilter : undefined,
            page: String(page),
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/5">
            <Package className="h-7 w-7 text-primary/60" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-foreground">
            {search || categoryFilter || brandFilter ? 'No products found' : 'No products yet'}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {search || categoryFilter || brandFilter
              ? 'Try adjusting your search or filters.'
              : 'Add your first product to start managing your inventory.'}
          </p>
          {canCreate && !search && !categoryFilter && !brandFilter && (
            <Link
              href="/products/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add First Product
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
