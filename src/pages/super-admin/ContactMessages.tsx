import { useState, useEffect } from "react";
import {
    Search,
    Filter,
    Mail,
    Calendar,
    Eye,
    CheckCircle2,
    Clock,
    User,
    MessageSquare,
    MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { contactService, ContactMessage } from "@/services/contactService";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const getStatusBadge = (status: string) => {
    switch (status) {
        case "unread":
            return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">Unread</Badge>;
        case "read":
            return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none">Read</Badge>;
        case "replied":
            return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Replied</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
};

export default function ContactMessages() {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const data = await contactService.getAllMessages();
            setMessages(data);
        } catch (error: any) {
            toast.error(error.message || "Failed to load messages");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleUpdateStatus = async (id: number, status: 'unread' | 'read' | 'replied') => {
        try {
            await contactService.updateMessageStatus(id, status);
            toast.success(`Status updated to ${status}`);
            setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, status } : msg));
            if (selectedMessage?.id === id) {
                setSelectedMessage(prev => prev ? { ...prev, status } : null);
            }
        } catch (error: any) {
            toast.error("Failed to update status");
        }
    };

    const handleViewDetails = (message: ContactMessage) => {
        setSelectedMessage(message);
        setDetailsOpen(true);
        if (message.status === 'unread') {
            handleUpdateStatus(message.id, 'read');
        }
    };

    const filteredMessages = messages.filter((msg) => {
        const matchesSearch = 
            msg.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.message.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Contact Messages</h1>
                <p className="text-muted-foreground">Manage and respond to inquiries from the public website.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex-1 w-full sm:max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search messages..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Messages</SelectItem>
                            <SelectItem value="unread">Unread</SelectItem>
                            <SelectItem value="read">Read</SelectItem>
                            <SelectItem value="replied">Replied</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={fetchMessages} size="icon">
                        <Clock className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Messages List */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-4 space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-4 items-center">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-1/4" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredMessages.length === 0 ? (
                        <div className="p-12 text-center space-y-3">
                            <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                            <h3 className="text-lg font-medium">No messages found</h3>
                            <p className="text-muted-foreground">Inquiries from the website will appear here.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer ${msg.status === 'unread' ? 'bg-blue-50/30' : ''}`}
                                    onClick={() => handleViewDetails(msg)}
                                >
                                    <div className={`p-3 rounded-full ${msg.status === 'unread' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                        <MessageSquare className="h-5 w-5" />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className={`font-semibold ${msg.status === 'unread' ? 'text-blue-900' : ''}`}>{msg.full_name}</h3>
                                            {getStatusBadge(msg.status)}
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                {format(new Date(msg.created_at), 'MMM dd, yyyy HH:mm')}
                                            </span>
                                        </div>
                                        <div className="font-medium text-sm text-slate-800 truncate">
                                            {msg.subject}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                            {msg.message}
                                        </p>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleViewDetails(msg)}>
                                                <Eye className="h-4 w-4 mr-2" />
                                                View Details
                                            </DropdownMenuItem>
                                            {msg.status !== 'replied' && (
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(msg.id, 'replied')}>
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    Mark as Replied
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center pr-6">
                            <span>Message Details</span>
                            {selectedMessage && getStatusBadge(selectedMessage.status)}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedMessage && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">From</Label>
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{selectedMessage.full_name}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Email</Label>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <a href={`mailto:${selectedMessage.email}`} className="text-primary hover:underline">{selectedMessage.email}</a>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Subject</Label>
                                    <div className="font-medium">{selectedMessage.subject}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Received At</Label>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span>{format(new Date(selectedMessage.created_at), 'PPPP p')}</span>
                                    </div>
                                </div>
                            </div>

                            <Card className="bg-muted/30">
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm font-semibold">Message</CardTitle>
                                </CardHeader>
                                <CardContent className="py-0 pb-4">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                        {selectedMessage.message}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
                        {selectedMessage?.status !== 'replied' && (
                            <Button 
                                variant="default" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                    if (selectedMessage) handleUpdateStatus(selectedMessage.id, 'replied');
                                    setDetailsOpen(false);
                                }}
                            >
                                Mark as Replied
                            </Button>
                        )}
                        <Button asChild>
                            <a href={`mailto:${selectedMessage?.email}?subject=Re: ${selectedMessage?.subject}`}>
                                Reply via Email
                            </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
        {children}
    </div>
);
