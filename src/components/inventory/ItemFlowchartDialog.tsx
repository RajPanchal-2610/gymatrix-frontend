import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { InventoryItem, InventoryTransaction } from "@/types/inventory";
import { inventoryService } from "@/services/inventoryService";
import { useGym } from "@/hooks/useGym";
import {
    ReactFlow,
    Background,
    Controls,
    Node,
    Edge,
    MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface ItemFlowchartDialogProps {
    item: InventoryItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ItemFlowchartDialog({ item, open, onOpenChange }: ItemFlowchartDialogProps) {
    const { gymId } = useGym();
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && item && gymId) {
            setLoading(true);
            inventoryService.getItemTransactions(gymId, item.id)
                .then(data => {
                    setTransactions(data);
                })
                .catch(err => console.error("Failed to load transactions", err))
                .finally(() => setLoading(false));
        } else {
            setTransactions([]);
        }
    }, [open, item, gymId]);

    if (!item) return null;

    const getNodeColor = (type: string) => {
        switch (type) {
            case 'purchase': return { bg: '#eff6ff', border: '#bfdbfe', text: 'text-blue-800' };
            case 'opening_stock': return { bg: '#f0fdfa', border: '#99f6e4', text: 'text-teal-800' };
            case 'repair': return { bg: '#fff7ed', border: '#fed7aa', text: 'text-orange-800' };
            case 'replacement': return { bg: '#f0fdf4', border: '#bbf7d0', text: 'text-green-800' }; // Finish repair
            case 'adjustment': return { bg: '#faf5ff', border: '#e9d5ff', text: 'text-purple-800' };
            default: return { bg: '#ffffff', border: '#e2e8f0', text: 'text-slate-800' };
        }
    };

    const getTransactionLabel = (type: string) => {
        switch (type) {
            case 'purchase': return 'Purchased';
            case 'opening_stock': return 'Opening Stock';
            case 'repair': return 'Sent to Repair';
            case 'replacement': return 'Repaired / Returned';
            case 'adjustment': return 'Stock Adjustment';
            default: return type;
        }
    };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Base Node: Creation
    nodes.push({
        id: 'node-create',
        position: { x: 250, y: 50 },
        data: {
            label: (
                <div className="p-2 w-56 flex flex-col items-center">
                    <div className="text-xs text-muted-foreground mb-1">
                        {new Date(item.created_at || '').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <Badge variant="outline" className="mb-2 bg-slate-100">Item Catalogued</Badge>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        Base Price: ₹{item.purchase_price || 0}
                    </div>
                </div>
            )
        },
        type: 'input',
        style: {
            background: '#ffffff',
            border: '2px solid #cbd5e1',
            borderRadius: '8px',
            width: 250,
        }
    });

    let currentY = 200;
    let prevId = 'node-create';
    let isRightSide = true; // Use this to toggle side

    let totalStock = 0;
    let availableStock = 0;

    // Transaction Nodes
    transactions.forEach((trx, index) => {
        const id = `node-trx-${trx.id}`;
        const colors = getNodeColor(trx.transaction_type);
        let prefix = '';
        if (['purchase', 'opening_stock', 'adjustment', 'replacement'].includes(trx.transaction_type)) {
            prefix = trx.quantity > 0 ? '+' : '';
        } else {
            prefix = '-';
        }

        // Update running totals
        switch (trx.transaction_type) {
            case 'purchase':
            case 'opening_stock':
            case 'adjustment':
                totalStock += trx.quantity;
                availableStock += trx.quantity;
                break;
            case 'repair':
                availableStock -= trx.quantity;
                break;
            case 'replacement':
                availableStock += trx.quantity;
                break;
        }

        // Calculate staggered x position
        const xPos = isRightSide ? 400 : 100;

        nodes.push({
            id,
            position: { x: xPos, y: currentY },
            data: {
                label: (
                    <div className="p-2 w-56 flex flex-col items-center gap-1">
                        <div className="text-xs text-muted-foreground w-full text-center border-b pb-1">
                            {new Date(trx.created_at || '').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <Badge variant="secondary" className={`capitalize ${colors.text} bg-transparent mt-1 border-none shadow-none text-base`}>
                            {getTransactionLabel(trx.transaction_type)}
                        </Badge>
                        <div className="font-bold text-lg mt-1">
                            {prefix}{trx.quantity} <span className="text-xs font-normal text-muted-foreground">unit(s)</span>
                        </div>
                        {trx.total_cost && trx.total_cost > 0 && (
                            <div className="text-sm font-medium mt-1">
                                Cost: <span className="text-green-600 font-bold">₹{Number(trx.total_cost).toFixed(2)}</span>
                            </div>
                        )}
                        {trx.notes && (
                            <div className="text-xs italic text-muted-foreground text-center mt-1 px-2 mb-1">
                                "{trx.notes}"
                            </div>
                        )}
                        <div className="flex gap-2 text-xs font-medium border-t w-full justify-center pt-2 mt-1 whitespace-nowrap">
                            <span className="text-slate-600">Total: {totalStock}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-600">Avail: {availableStock}</span>
                        </div>
                    </div>
                )
            },
            type: 'default',
            style: {
                background: colors.bg,
                border: `2px solid ${colors.border}`,
                borderRadius: '8px',
                width: 250,
            }
        });

        edges.push({
            id: `edge-${prevId}-${id}`,
            source: prevId,
            target: id,
            type: 'smoothstep', // Use smoothstep to make curved elbows instead of straight diagonal lines
            animated: true,
            style: { stroke: '#94a3b8', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
        });

        prevId = id;
        currentY += 150; // closer vertical spacing looks better with staggered zig-zag
        isRightSide = !isRightSide; // Toggle side
    });

    // We can also have a final "Current Status" node at the bottom
    const finalId = 'node-final';
    nodes.push({
        id: finalId,
        position: { x: 250, y: currentY + 50 },
        data: {
            label: (
                <div className="p-2 w-56 flex flex-col items-center">
                    <div className="font-semibold text-sm mb-1 uppercase text-slate-500">Current Status</div>
                    <Badge variant="outline" className="mb-2">{item.status} / {item.condition}</Badge>
                </div>
            )
        },
        type: 'output',
        style: {
            background: '#f8fafc',
            border: '2px dashed #94a3b8',
            borderRadius: '8px',
            width: 250,
        }
    });

    edges.push({
        id: `edge-${prevId}-${finalId}`,
        source: prevId,
        target: finalId,
        animated: false,
        style: { stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '5,5' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center pr-6">
                        <span>Timeline Flowchart: {item.name}</span>
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 w-full bg-slate-50/50 rounded-md border mt-4 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            Loading timeline...
                        </div>
                    ) : (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            fitView
                            className="bg-dot-pattern"
                            nodesDraggable={false}
                        >
                            <Background />
                            <Controls />
                        </ReactFlow>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
