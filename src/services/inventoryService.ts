import { supabase } from '@/lib/supabase';
import {
    InventoryCategory,
    InventoryVendor,
    InventoryItem,
    InventoryStock,
    InventoryPurchase,
    InventoryTransaction,
    InventoryMaintenance
} from '@/types/inventory';

export const inventoryService = {
    // --- CATEGORIES ---
    async getCategories(gymId: number): Promise<InventoryCategory[]> {
        const { data, error } = await supabase
            .from('gym_inventory_categories')
            .select('*')
            .eq('gym_id', gymId)
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async createCategory(category: Partial<InventoryCategory>): Promise<InventoryCategory> {
        const { data, error } = await supabase
            .from('gym_inventory_categories')
            .insert(category)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateCategory(id: number, category: Partial<InventoryCategory>): Promise<InventoryCategory> {
        const { data, error } = await supabase
            .from('gym_inventory_categories')
            .update(category)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteCategory(id: number): Promise<void> {
        const { error } = await supabase
            .from('gym_inventory_categories')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- VENDORS ---
    async getVendors(gymId: number): Promise<InventoryVendor[]> {
        const { data, error } = await supabase
            .from('gym_inventory_vendors')
            .select('*')
            .eq('gym_id', gymId)
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async createVendor(vendor: Partial<InventoryVendor>): Promise<InventoryVendor> {
        const { data, error } = await supabase
            .from('gym_inventory_vendors')
            .insert(vendor)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateVendor(id: number, vendor: Partial<InventoryVendor>): Promise<InventoryVendor> {
        const { data, error } = await supabase
            .from('gym_inventory_vendors')
            .update(vendor)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteVendor(id: number): Promise<void> {
        const { error } = await supabase
            .from('gym_inventory_vendors')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- ITEMS & STOCK ---
    async getItems(gymId: number): Promise<(InventoryItem & { gym_inventory_stock?: InventoryStock, gym_inventory_categories?: InventoryCategory })[]> {
        const { data, error } = await supabase
            .from('gym_inventory_items')
            .select(`
        *,
        gym_inventory_stock(*),
        gym_inventory_categories(*)
      `)
            .eq('gym_id', gymId)
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async createItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
        const { data, error } = await supabase
            .from('gym_inventory_items')
            .insert(item)
            .select()
            .single();
        if (error) throw error;

        // Also initialize stock record
        if (data) {
            const { error: stockError } = await supabase
                .from('gym_inventory_stock')
                .insert({
                    gym_id: data.gym_id,
                    item_id: data.id,
                    total_quantity: 0,
                    available_quantity: 0,
                    damaged_quantity: 0,
                    repair_quantity: 0
                });
            if (stockError) throw stockError;
        }
        return data;
    },

    async updateItem(id: number, item: Partial<InventoryItem>): Promise<InventoryItem> {
        const { data, error } = await supabase
            .from('gym_inventory_items')
            .update(item)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteItem(id: number): Promise<void> {
        const { error } = await supabase
            .from('gym_inventory_items')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- PURCHASES & TRANSACTIONS ---
    async getPurchases(gymId: number): Promise<(InventoryPurchase & { gym_inventory_vendors?: InventoryVendor })[]> {
        const { data, error } = await supabase
            .from('gym_inventory_purchases')
            .select(`
        *,
        gym_inventory_vendors(*)
      `)
            .eq('gym_id', gymId)
            .order('purchase_date', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createPurchase(purchase: Partial<InventoryPurchase>): Promise<InventoryPurchase> {
        const { data, error } = await supabase
            .from('gym_inventory_purchases')
            .insert(purchase)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getTransactions(gymId: number): Promise<(InventoryTransaction & { gym_inventory_items?: InventoryItem, gym_inventory_purchases?: InventoryPurchase })[]> {
        const { data, error } = await supabase
            .from('gym_inventory_transactions')
            .select(`
        *,
        gym_inventory_items(name, brand, model),
        gym_inventory_purchases(purchase_date, vendor_id)
      `)
            .eq('gym_id', gymId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async getItemTransactions(gymId: number, itemId: number): Promise<InventoryTransaction[]> {
        const { data, error } = await supabase
            .from('gym_inventory_transactions')
            .select('*')
            .eq('gym_id', gymId)
            .eq('item_id', itemId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async handleTransaction(transaction: Partial<InventoryTransaction>): Promise<InventoryTransaction> {
        // 1. Insert Transaction
        const { data, error } = await supabase
            .from('gym_inventory_transactions')
            .insert(transaction)
            .select()
            .single();
        if (error) throw error;

        // 2. Fetch current stock
        const { data: stockData, error: stockFetchError } = await supabase
            .from('gym_inventory_stock')
            .select('*')
            .eq('item_id', transaction.item_id)
            .single();

        if (stockFetchError) throw stockFetchError;

        // 3. Calculate new stock based on transaction type
        let updates = { ...stockData };
        const qty = transaction.quantity || 0;

        switch (transaction.transaction_type) {
            case 'purchase':
            case 'opening_stock':
                updates.total_quantity += qty;
                updates.available_quantity += qty;
                break;
            case 'repair':
                if (updates.damaged_quantity >= qty) {
                    updates.damaged_quantity -= qty;
                } else {
                    updates.available_quantity -= qty;
                }
                updates.repair_quantity += qty;
                break;
            case 'replacement': // finished repair
                updates.repair_quantity -= qty;
                updates.available_quantity += qty;
                break;
            case 'adjustment': // manual correction of available
                updates.total_quantity += qty;
                updates.available_quantity += qty;
                break;
        }

        // 4. Update Stock
        const { error: stockUpdateError } = await supabase
            .from('gym_inventory_stock')
            .update({
                total_quantity: Math.max(0, updates.total_quantity),
                available_quantity: Math.max(0, updates.available_quantity),
                damaged_quantity: Math.max(0, updates.damaged_quantity),
                repair_quantity: Math.max(0, updates.repair_quantity),
            })
            .eq('id', stockData.id);

        if (stockUpdateError) throw stockUpdateError;

        return data;
    },

    // --- MAINTENANCE ---
    async getMaintenance(gymId: number): Promise<(InventoryMaintenance & { gym_inventory_items?: InventoryItem })[]> {
        const { data, error } = await supabase
            .from('gym_inventory_maintenance')
            .select(`
        *,
        gym_inventory_items(name, brand, model)
      `)
            .eq('gym_id', gymId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createMaintenance(maintenance: Partial<InventoryMaintenance>): Promise<InventoryMaintenance> {
        const { data, error } = await supabase
            .from('gym_inventory_maintenance')
            .insert(maintenance)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateMaintenance(id: number, maintenance: Partial<InventoryMaintenance>): Promise<InventoryMaintenance> {
        const { data, error } = await supabase
            .from('gym_inventory_maintenance')
            .update(maintenance)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteMaintenance(id: number): Promise<void> {
        const { error } = await supabase
            .from('gym_inventory_maintenance')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};
