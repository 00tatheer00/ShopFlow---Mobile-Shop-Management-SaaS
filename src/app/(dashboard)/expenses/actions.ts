'use server';

import { createClient } from '@/lib/supabase/server';
import { requireShopAccess, hasPermission } from '@/lib/auth';
import { expenseSchema, updateExpenseSchema, expenseCategorySchema } from '@/lib/validations';
import { toPaisas, type PaymentMethod } from '@/lib/types';
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
    payment_method: ((formData.get('payment_method') as string) || 'cash') as PaymentMethod,
    notes: (formData.get('notes') as string) || undefined,
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

  const amountPaisas = toPaisas(result.data.amount);
  if (amountPaisas <= 0) {
    return { error: 'Expense amount must be greater than zero.' };
  }

  const { data: inserted, error } = await supabase
    .from('expenses')
    .insert({
      shop_id: user.shop_id,
      category_id: result.data.category_id || null,
      amount: amountPaisas,
      description: result.data.description || null,
      expense_date: result.data.expense_date,
      payment_method: result.data.payment_method,
      notes: result.data.notes || null,
      created_by: user.id,
    })
    .select('id, amount, expense_date')
    .single();

  if (error) {
    console.error('Create expense error:', error);
    return { error: 'Failed to record expense. Please try again.' };
  }

  // Audit logging
  try {
    await supabase.from('audit_logs').insert({
      shop_id: user.shop_id,
      user_id: user.id,
      action: 'expense_created',
      entity_type: 'expense',
      entity_id: inserted.id,
      metadata: {
        amount: amountPaisas,
        category_id: result.data.category_id || null,
        payment_method: result.data.payment_method,
        expense_date: result.data.expense_date,
      },
    });
  } catch (auditErr) {
    console.warn('Failed to record audit log for createExpense:', auditErr);
  }

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { success: true, id: inserted.id };
}

export async function updateExpense(formData: FormData) {
  const user = await requireShopAccess();
  if (user.role !== 'shop_owner' && user.role !== 'manager') {
    return { error: 'You do not have permission to edit expenses.' };
  }

  const raw = {
    id: formData.get('id') as string,
    category_id: (formData.get('category_id') as string) || undefined,
    amount: Number(formData.get('amount')) || 0,
    description: (formData.get('description') as string) || undefined,
    expense_date: (formData.get('expense_date') as string) || new Date().toISOString().split('T')[0],
    payment_method: ((formData.get('payment_method') as string) || 'cash') as PaymentMethod,
    notes: (formData.get('notes') as string) || undefined,
  };

  const result = updateExpenseSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  // Verify expense belongs to this tenant shop
  const { data: existing } = await supabase
    .from('expenses')
    .select('id, amount, shop_id')
    .eq('id', result.data.id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!existing) {
    return { error: 'Expense record not found or does not belong to your shop.' };
  }

  // Verify category belongs to this shop if changed
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

  const amountPaisas = toPaisas(result.data.amount);
  if (amountPaisas <= 0) {
    return { error: 'Expense amount must be greater than zero.' };
  }

  const { error } = await supabase
    .from('expenses')
    .update({
      category_id: result.data.category_id || null,
      amount: amountPaisas,
      description: result.data.description || null,
      expense_date: result.data.expense_date,
      payment_method: result.data.payment_method,
      notes: result.data.notes || null,
    })
    .eq('id', result.data.id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    console.error('Update expense error:', error);
    return { error: 'Failed to update expense. Please try again.' };
  }

  // Audit logging
  try {
    await supabase.from('audit_logs').insert({
      shop_id: user.shop_id,
      user_id: user.id,
      action: 'expense_updated',
      entity_type: 'expense',
      entity_id: result.data.id,
      metadata: {
        old_amount: existing.amount,
        new_amount: amountPaisas,
        category_id: result.data.category_id || null,
        payment_method: result.data.payment_method,
      },
    });
  } catch (auditErr) {
    console.warn('Failed to record audit log for updateExpense:', auditErr);
  }

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { success: true };
}

export async function deleteExpense(id: string) {
  const user = await requireShopAccess();
  if (user.role !== 'shop_owner' && user.role !== 'manager') {
    return { error: 'You do not have permission to delete expenses.' };
  }

  const supabase = await createClient();

  // Verify expense belongs to this tenant shop
  const { data: existing } = await supabase
    .from('expenses')
    .select('id, amount, description, expense_date')
    .eq('id', id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!existing) {
    return { error: 'Expense record not found or does not belong to your shop.' };
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to delete expense.' };
  }

  // Audit logging
  try {
    await supabase.from('audit_logs').insert({
      shop_id: user.shop_id,
      user_id: user.id,
      action: 'expense_deleted',
      entity_type: 'expense',
      entity_id: id,
      metadata: {
        deleted_amount: existing.amount,
        description: existing.description,
        expense_date: existing.expense_date,
      },
    });
  } catch (auditErr) {
    console.warn('Failed to record audit log for deleteExpense:', auditErr);
  }

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
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
      name: result.data.name.trim(),
    })
    .select('id, name')
    .single();

  if (error) {
    return { error: 'Failed to create category or category already exists.' };
  }

  revalidatePath('/expenses');
  return { success: true, category: data };
}
