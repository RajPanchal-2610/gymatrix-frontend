import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface AlertMember {
    id: string | number;
    name: string;
    expiryDate: string;
    daysRemaining: number;
    status: 'active' | 'expired';
}

interface MembershipAlertsProps {
    members: AlertMember[];
    loading?: boolean;
}

export function MembershipAlerts({ members, loading }: MembershipAlertsProps) {
    if (loading) {
        return (
            <Card className="animate-slide-up shadow-md overflow-hidden">
                <CardHeader className="pb-0">
                    <div className="flex items-center justify-between mb-2">
                        <Skeleton className="h-6 w-40" />
                        <div className="flex gap-2">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-16" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="w-full h-11 border-b px-4 flex items-center gap-4">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="divide-y divide-border">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4">
                                <Skeleton className="h-9 w-9 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Skeleton className="h-4 w-12" />
                                    <Skeleton className="h-3 w-14" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const expired = members.filter(m => m.status === 'expired' || m.daysRemaining < 0);
    const expiring = members.filter(m => m.status === 'active' && m.daysRemaining >= 0);

    const MemberItem = ({ member }: { member: AlertMember }) => (
        <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b last:border-0">
            <Avatar className="h-9 w-9">
                <AvatarFallback className={`${member.status === 'expired' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'} text-xs font-medium`}>
                    {member.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{member.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                    {member.status === 'expired' ? 'Expired on:' : 'Expires on:'} {member.expiryDate}
                </p>
            </div>
            <div className="text-right flex flex-col items-end">
                {member.status === 'expired' || member.daysRemaining < 0 ? (
                    <div className="flex flex-col items-end">
                        <Badge variant="destructive" className="text-[10px] h-5 px-2 mb-1">Expired</Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {Math.abs(member.daysRemaining)} {Math.abs(member.daysRemaining) === 1 ? 'day' : 'days'} ago
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col items-end">
                        <span className={`text-xs font-bold ${member.daysRemaining <= 3 ? 'text-destructive' : 'text-warning'}`}>
                            {member.daysRemaining === 0 ? 'Today' :
                                member.daysRemaining === 1 ? 'Tomorrow' :
                                    `${member.daysRemaining} days`}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase">Remaining</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <Card className="animate-slide-up shadow-md overflow-hidden">
            <CardHeader className="pb-0">
                <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Membership Alerts
                    </CardTitle>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="text-[10px] bg-destructive/5 text-destructive border-destructive/20">
                            {expired.length} Expired
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-warning/5 text-warning border-warning/20">
                            {expiring.length} Expiring
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-11 px-4 gap-4">
                        <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 text-xs font-semibold">
                            All ({members.length})
                        </TabsTrigger>
                        <TabsTrigger value="expiring" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-warning data-[state=active]:shadow-none rounded-none px-2 text-xs font-semibold">
                            Expiring Soon
                        </TabsTrigger>
                        <TabsTrigger value="expired" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-destructive data-[state=active]:shadow-none rounded-none px-2 text-xs font-semibold">
                            Expired
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="m-0 mt-0">
                        <div className="max-h-[300px] overflow-y-auto">
                            {members.length === 0 ? (
                                <EmptyState icon={<CheckCircle2 className="h-8 w-8 text-success/40" />} message="All memberships are up to date!" />
                            ) : (
                                members.map(m => <MemberItem key={m.id} member={m} />)
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="expiring" className="m-0 mt-0">
                        <div className="max-h-[300px] overflow-y-auto">
                            {expiring.length === 0 ? (
                                <EmptyState icon={<CheckCircle2 className="h-8 w-8 text-success/40" />} message="No memberships expiring this week." />
                            ) : (
                                expiring.map(m => <MemberItem key={m.id} member={m} />)
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="expired" className="m-0 mt-0">
                        <div className="max-h-[300px] overflow-y-auto">
                            {expired.length === 0 ? (
                                <EmptyState icon={<CheckCircle2 className="h-8 w-8 text-success/40" />} message="No recently expired memberships found." />
                            ) : (
                                expired.map(m => <MemberItem key={m.id} member={m} />)
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

const EmptyState = ({ icon, message }: { icon: React.ReactNode, message: string }) => (
    <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        {icon}
        <p className="text-muted-foreground text-sm font-medium">{message}</p>
    </div>
);
