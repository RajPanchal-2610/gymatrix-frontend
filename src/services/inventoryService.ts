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
        const { gym_inventory_stock, gym_inventory_categories, ...cleanItem } = item as any;
        const { data, error } = await supabase
            .from('gym_inventory_items')
            .insert(cleanItem)
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
        const { gym_inventory_stock, gym_inventory_categories, ...cleanItem } = item as any;
        const { data, error } = await supabase
            .from('gym_inventory_items')
            .update(cleanItem)
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

    async updateOpeningStock(gymId: number, itemId: number, newQty: number, oldQty: number): Promise<void> {
        // 1. Find the opening stock transaction
        const { data: txData, error: txFetchError } = await supabase
            .from('gym_inventory_transactions')
            .select('*')
            .eq('item_id', itemId)
            .eq('transaction_type', 'opening_stock')
            .maybeSingle();

        if (txFetchError) throw txFetchError;

        const diff = newQty - oldQty;

        if (txData) {
            // Update existing transaction
            const { error: txUpdateError } = await supabase
                .from('gym_inventory_transactions')
                .update({ quantity: newQty, total_cost: txData.unit_cost ? txData.unit_cost * newQty : 0 })
                .eq('id', txData.id);
            if (txUpdateError) throw txUpdateError;
        } else {
            // Create new transaction
            const { error: txInsertError } = await supabase
                .from('gym_inventory_transactions')
                .insert({
                    gym_id: gymId,
                    item_id: itemId,
                    transaction_type: 'opening_stock',
                    quantity: newQty,
                    notes: 'Initial opening stock',
                    total_cost: 0
                });
            if (txInsertError) throw txInsertError;
        }

        // 2. Fetch current stock
        const { data: stockData, error: stockFetchError } = await supabase
            .from('gym_inventory_stock')
            .select('*')
            .eq('item_id', itemId)
            .single();

        if (stockFetchError) throw stockFetchError;

        // 3. Update stock
        const { error: stockUpdateError } = await supabase
            .from('gym_inventory_stock')
            .update({
                total_quantity: Math.max(0, stockData.total_quantity + diff),
                available_quantity: Math.max(0, stockData.available_quantity + diff)
            })
            .eq('id', stockData.id);

        if (stockUpdateError) throw stockUpdateError;
    },

    async updatePurchase(id: number, purchase: Partial<InventoryPurchase>): Promise<InventoryPurchase> {
        const { data, error } = await supabase
            .from('gym_inventory_purchases')
            .update(purchase)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteTransaction(id: number): Promise<void> {
        // 1. Fetch the target transaction
        const { data: trx, error: trxfError } = await supabase
            .from('gym_inventory_transactions')
            .select('*')
            .eq('id', id)
            .single();
        if (trxfError) throw trxfError;

        // 2. Fetch current stock
        const { data: stockData, error: stockFetchError } = await supabase
            .from('gym_inventory_stock')
            .select('*')
            .eq('item_id', trx.item_id)
            .single();
        if (stockFetchError) throw stockFetchError;

        // 3. Revert stock levels (inverse of transaction type effects)
        let updates = { ...stockData };
        const qty = trx.quantity || 0;

        switch (trx.transaction_type) {
            case 'purchase':
            case 'opening_stock':
            case 'adjustment':
                updates.total_quantity -= qty;
                updates.available_quantity -= qty;
                break;
            case 'repair':
                updates.repair_quantity -= qty;
                updates.available_quantity += qty;
                break;
            case 'replacement':
                updates.repair_quantity += qty;
                updates.available_quantity -= qty;
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

        // 5. Delete linked purchase or maintenance if present
        if (trx.purchase_id) {
            await supabase.from('gym_inventory_purchases').delete().eq('id', trx.purchase_id);
        }
        if (trx.maintenance_id) {
            await supabase.from('gym_inventory_maintenance').delete().eq('id', trx.maintenance_id);
        }

        // 6. Delete transaction record
        const { error: deleteError } = await supabase
            .from('gym_inventory_transactions')
            .delete()
            .eq('id', id);
        if (deleteError) throw deleteError;
    },

    async updateTransaction(id: number, updates: Partial<InventoryTransaction>): Promise<InventoryTransaction> {
        // 1. Fetch original transaction
        const { data: oldTrx, error: oldTrxfError } = await supabase
            .from('gym_inventory_transactions')
            .select('*')
            .eq('id', id)
            .single();
        if (oldTrxfError) throw oldTrxfError;

        // 2. Fetch current stock
        const { data: stockData, error: stockFetchError } = await supabase
            .from('gym_inventory_stock')
            .select('*')
            .eq('item_id', oldTrx.item_id)
            .single();
        if (stockFetchError) throw stockFetchError;

        // 3. First, revert original transaction effect
        let stockUpdates = { ...stockData };
        const oldQty = oldTrx.quantity || 0;

        switch (oldTrx.transaction_type) {
            case 'purchase':
            case 'opening_stock':
            case 'adjustment':
                stockUpdates.total_quantity -= oldQty;
                stockUpdates.available_quantity -= oldQty;
                break;
            case 'repair':
                stockUpdates.repair_quantity -= oldQty;
                stockUpdates.available_quantity += oldQty;
                break;
            case 'replacement':
                stockUpdates.repair_quantity += oldQty;
                stockUpdates.available_quantity -= oldQty;
                break;
        }

        // 4. Next, apply new transaction effect
        const newType = updates.transaction_type || oldTrx.transaction_type;
        const newQty = updates.quantity !== undefined ? updates.quantity : oldTrx.quantity;

        switch (newType) {
            case 'purchase':
            case 'opening_stock':
            case 'adjustment':
                stockUpdates.total_quantity += newQty;
                stockUpdates.available_quantity += newQty;
                break;
            case 'repair':
                stockUpdates.repair_quantity += newQty;
                stockUpdates.available_quantity -= newQty;
                break;
            case 'replacement':
                stockUpdates.repair_quantity -= newQty;
                stockUpdates.available_quantity += newQty;
                break;
        }

        // 5. Update Stock
        const { error: stockUpdateError } = await supabase
            .from('gym_inventory_stock')
            .update({
                total_quantity: Math.max(0, stockUpdates.total_quantity),
                available_quantity: Math.max(0, stockUpdates.available_quantity),
                damaged_quantity: Math.max(0, stockUpdates.damaged_quantity),
                repair_quantity: Math.max(0, stockUpdates.repair_quantity),
            })
            .eq('id', stockData.id);
        if (stockUpdateError) throw stockUpdateError;

        // 6. Update Transaction Record
        const { data, error } = await supabase
            .from('gym_inventory_transactions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
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
        // 1. Fetch all transactions associated with this maintenance_id
        const { data: transactions, error: trxError } = await supabase
            .from('gym_inventory_transactions')
            .select('*')
            .eq('maintenance_id', id);
 
        if (trxError) throw trxError;
 
        // 2. Revert stock effects for each transaction
        if (transactions && transactions.length > 0) {
            const itemId = transactions[0].item_id;
 
            // Fetch current stock
            const { data: stockData, error: stockFetchError } = await supabase
                .from('gym_inventory_stock')
                .select('*')
                .eq('item_id', itemId)
                .single();
 
            if (!stockFetchError && stockData) {
                let updates = { ...stockData };
                for (const trx of transactions) {
                    const qty = trx.quantity || 0;
                    switch (trx.transaction_type) {
                        case 'purchase':
                        case 'opening_stock':
                        case 'adjustment':
                            updates.total_quantity -= qty;
                            updates.available_quantity -= qty;
                            break;
                        case 'repair':
                            updates.repair_quantity -= qty;
                            updates.available_quantity += qty;
                            break;
                        case 'replacement':
                            updates.repair_quantity += qty;
                            updates.available_quantity -= qty;
                            break;
                    }
                }
 
                // Update stock
                await supabase
                    .from('gym_inventory_stock')
                    .update({
                        total_quantity: Math.max(0, updates.total_quantity),
                        available_quantity: Math.max(0, updates.available_quantity),
                        damaged_quantity: Math.max(0, updates.damaged_quantity),
                        repair_quantity: Math.max(0, updates.repair_quantity),
                    })
                    .eq('id', stockData.id);
            }
 
            // 3. Delete those transactions
            const { error: deleteTrxError } = await supabase
                .from('gym_inventory_transactions')
                .delete()
                .eq('maintenance_id', id);
            if (deleteTrxError) throw deleteTrxError;
        }
 
        // 4. Delete the maintenance record
        const { error } = await supabase
            .from('gym_inventory_maintenance')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};
