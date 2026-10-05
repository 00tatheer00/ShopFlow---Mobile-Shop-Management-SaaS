'use server';

import { createClient } from '@/lib/supabase/server';
import { requireShopAccess, hasPermission } from '@/lib/auth';
import { expenseSchema, expenseCategorySchema } from '@/lib/validations';
import { toPaisas } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function createExpense(formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'expenses:create')) {
    return { error: 'You do not have permission to record expenses.' };
  }

  const raw = {
    category_id: (formData.get('category_id') as string) || undefined,
    amount: Number(formData.get('amount')) || 0,
    description: (formData.get('description') as string) || undefined,
    expense_date: (formData.get('expense_date') as string) || new Date().toISOString().split('T')[0],
  };

  const result = expenseSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  // Verify category belongs to this shop if provided
  if (result.data.category_id) {
    const { data: category } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('id', result.data.category_id)
      .eq('shop_id', user.shop_id!)
      .single();

    if (!category) {
      return { error: 'Selected expense category does not belong to this shop.' };
    }
  }

  const { error } = await supabase.from('expenses').insert({
    shop_id: user.shop_id,
    category_id: result.data.category_id || null,
    amount: toPaisas(result.data.amount),
    description: result.data.description || null,
    expense_date: result.data.expense_date,
    created_by: user.id,
  });

  if (error) {
    console.error('Create expense error:', error);
    return { error: 'Failed to record expense. Please try again.' };
  }

  revalidatePath('/expenses');
  return { success: true };
}

export async function deleteExpense(id: string) {
  const user = await requireShopAccess();
  if (user.role !== 'shop_owner' && user.role !== 'manager') {
    return { error: 'You do not have permission to delete expenses.' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to delete expense.' };
  }

  revalidatePath('/expenses');
  return { success: true };
}

export async function createExpenseCategory(name: string) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'expenses:create')) {
    return { error: 'You do not have permission to create categories.' };
  }

  const result = expenseCategorySchema.safeParse({ name });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({
      shop_id: user.shop_id,
      name: result.data.name,
    })
    .select('id, name')
    .single();

  if (error) {
    return { error: 'Failed to create category or category already exists.' };
  }

  revalidatePath('/expenses');
  return { success: true, category: data };
}
