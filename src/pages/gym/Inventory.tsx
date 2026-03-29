import { useState } from "react";
import { Package, List, Building2, Activity, Wrench } from "lucide-react";

import { InventoryItems } from "@/components/inventory/InventoryItems";
import { InventoryCategories } from "@/components/inventory/InventoryCategories";
import { InventoryVendors } from "@/components/inventory/InventoryVendors";
import { InventoryTransactions } from "@/components/inventory/InventoryTransactions";
import { InventoryMaintenance } from "@/components/inventory/InventoryMaintenance";

import { usePermissions } from "@/contexts/PermissionsContext";

export default function Inventory() {
    const { hasPermission } = usePermissions();
    const [activeSection, setActiveSection] = useState("items");

    if (!hasPermission('view_inventory')) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Package className="h-16 w-16 text-muted-foreground opacity-20" />
                <h2 className="text-xl font-semibold">Access Denied</h2>
                <p className="text-muted-foreground text-center max-w-md">
                    You do not have permission to view the inventory management section. 
                    Please contact your administrator if you believe this is an error.
                </p>
            </div>
        );
    }

    const flowSteps = [
        { id: "vendors", icon: Building2, title: "1. Supply Chain", desc: "Manage vendors & suppliers" },
        { id: "categories", icon: List, title: "2. Organization", desc: "Define item categories" },
        { id: "items", icon: Package, title: "3. Item Catalog", desc: "Core equipment & stock levels" },
        { id: "transactions", icon: Activity, title: "4. Transactions", desc: "Log purchases & movements" },
        { id: "maintenance", icon: Wrench, title: "5. Maintenance", desc: "Manage repairs & upkeep" },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case "vendors": return <InventoryVendors />;
            case "categories": return <InventoryCategories />;
            case "items": return <InventoryItems />;
            case "transactions": return <InventoryTransactions />;
            case "maintenance": return <InventoryMaintenance />;
            default: return <InventoryItems />;
        }
    };

    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">Inventory Dashboard</h2>
                    <p className="text-muted-foreground">
                        Manage your equipment lifecycle from vendors to maintenance.
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Left side: Flow Navigation */}
                    <div className="w-full lg:w-80 shrink-0 sticky top-6">
                        <div className="bg-card rounded-xl border shadow-sm p-4 text-card-foreground">
                            <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4 px-2 tracking-wider">Inventory Flow</h3>
                            <div className="relative">
                                {/* Connecting line */}
                                <div className="absolute left-[27px] top-8 bottom-8 w-[2px] bg-slate-200 dark:bg-slate-800 rounded-full" />

                                <div className="space-y-3 relative z-10">
                                    {flowSteps.map((step) => {
                                        const isActive = activeSection === step.id;
                                        return (
                                            <button
                                                key={step.id}
                                                onClick={() => setActiveSection(step.id)}
                                                className={`w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive
                                                    ? 'bg-primary/5 border border-primary/20 shadow-sm'
                                                    : 'hover:bg-muted border border-transparent hover:border-border'
                                                    }`}
                                            >
                                                <div className={`p-2.5 rounded-full flex-shrink-0 transition-colors ${isActive
                                                    ? 'bg-primary text-primary-foreground shadow-md'
                                                    : 'bg-background border shadow-sm text-muted-foreground'
                                                    }`}>
                                                    <step.icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`font-semibold text-sm leading-none mb-1.5 ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                                        {step.title}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground leading-tight">
                                                        {step.desc}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right side: Active Content */}
                    <div className="flex-1 w-full min-w-0">
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
