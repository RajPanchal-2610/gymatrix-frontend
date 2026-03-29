export interface InventoryCategory {
    id: number;
    gym_id: number;
    name: string;
    description?: string;
    created_at?: string;
}

export interface InventoryVendor {
    id: number;
    gym_id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    created_at?: string;
}

export interface InventoryItem {
    id: number;
    gym_id: number;
    category_id?: number;
    name: string;
    brand?: string;
    model?: string;
    purchase_price?: number;
    condition: string;
    status: string;
    purchase_date?: string;
    warranty_expiry?: string;
    created_at?: string;
    updated_at?: string;

    // Joined fields
    gym_inventory_categories?: InventoryCategory;
}

export interface InventoryStock {
    id: number;
    gym_id: number;
    item_id: number;
    total_quantity: number;
    available_quantity: number;
    damaged_quantity: number;
    repair_quantity: number;
    created_at?: string;
    updated_at?: string;

    // Joined fields
    gym_inventory_items?: InventoryItem;
}

export interface InventoryPurchase {
    id: number;
    gym_id: number;
    vendor_id?: number;
    total_amount?: number;
    purchase_date?: string;
    remarks?: string;
    created_at?: string;

    // Joined fields
    gym_inventory_vendors?: InventoryVendor;
}

export interface InventoryTransaction {
    id: number;
    gym_id: number;
    item_id: number;
    purchase_id?: number;
    maintenance_id?: number;
    transaction_type: 'purchase' | 'repair' | 'replacement' | 'adjustment' | 'opening_stock';
    quantity: number;
    unit_cost?: number;
    total_cost?: number;
    notes?: string;
    created_at?: string;

    // Joined fields
    gym_inventory_items?: InventoryItem;
    gym_inventory_purchases?: InventoryPurchase;
}

export interface InventoryMaintenance {
    id: number;
    gym_id: number;
    item_id: number;
    quantity: number;
    issue_description?: string;
    repair_cost?: number;
    repair_date?: string;
    repaired_by?: string;
    status: 'pending' | 'completed' | 'cancelled';
    created_at?: string;

    // Joined fields
    gym_inventory_items?: InventoryItem;
}
