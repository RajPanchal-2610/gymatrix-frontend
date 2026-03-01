import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, AlertCircle, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export interface UnpaidInvoice {
    id: string | number;
    memberName: string;
    amountDue: number;
    billingDate: string;
}

interface PendingPaymentsProps {
    invoices: UnpaidInvoice[];
    loading?: boolean;
    totalAmount?: number;
}

export function PendingPayments({ invoices, loading, totalAmount }: PendingPaymentsProps) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <Card className="animate-slide-up border-destructive/20 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="text-right space-y-1">
                        <Skeleton className="h-3 w-20 ml-auto" />
                        <Skeleton className="h-6 w-24 ml-auto" />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4">
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-5 w-14" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const displayTotal = totalAmount !== undefined ? totalAmount : invoices.reduce((sum, inv) => sum + inv.amountDue, 0);

    return (
        <Card className="animate-slide-up border-destructive/20 shadow-sm flex flex-col h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        Pending Payments
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Dues requiring follow-up</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Total Pending</p>
                    <p className="text-xl font-bold text-destructive">₹{displayTotal.toLocaleString()}</p>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
                    {invoices.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            Great news! No pending dues tracked at the moment.
                        </div>
                    ) : (
                        invoices.map((invoice) => (
                            <div
                                key={invoice.id}
                                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{invoice.memberName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Due since: {invoice.billingDate}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center font-semibold text-destructive">
                                        <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
                                        {invoice.amountDue.toLocaleString()}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] h-5 border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 cursor-pointer">
                                        Pending
                                    </Badge>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 border-t mt-auto">
                <Button
                    variant="ghost"
                    className="w-full mt-4 text-xs font-semibold group hover:bg-destructive/5 hover:text-destructive transition-all"
                    onClick={() => navigate("/payments")}
                >
                    View All Records
                    <ArrowRight className="ml-2 h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
                </Button>
            </CardFooter>
        </Card>
    );
}
