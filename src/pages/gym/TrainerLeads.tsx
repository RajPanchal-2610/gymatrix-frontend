import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Search,
  Trash2,
  Users,
  CheckCircle2,
  Inbox,
  Clock
} from "lucide-react";

interface Lead {
  id: string;
  trainer_id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  message: string;
  status: 'new' | 'contacted' | 'converted' | 'archived';
  created_at: string;
}

export default function TrainerLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('trainer_leads')
        .select('*')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleStatusChange = async (leadId: string, status: Lead['status']) => {
    try {
      const { error } = await supabase
        .from('trainer_leads')
        .update({ status })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, status } : lead));
      toast.success("Lead status updated successfully");
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status: " + error.message);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;

    try {
      const { error } = await supabase
        .from('trainer_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      toast.success("Lead deleted successfully");
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead: " + error.message);
    }
  };

  // Stats calculation
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const contactedLeads = leads.filter(l => l.status === 'contacted').length;
  const convertedLeads = leads.filter(l => l.status === 'converted').length;

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.client_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Lead['status']) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-none rounded-full px-3 py-0.5 text-xs font-semibold capitalize">New</Badge>;
      case 'contacted':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none rounded-full px-3 py-0.5 text-xs font-semibold capitalize">Contacted</Badge>;
      case 'converted':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-full px-3 py-0.5 text-xs font-semibold capitalize">Converted</Badge>;
      case 'archived':
        return <Badge className="bg-slate-500 hover:bg-slate-600 text-white border-none rounded-full px-3 py-0.5 text-xs font-semibold capitalize">Archived</Badge>;
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="w-full space-y-8 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inquiries</h1>
        <p className="text-muted-foreground">
          Manage prospective client inquiries submitted from your public profile on the website.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border bg-card/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Inquiries</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">Lifetime lead count</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-muted-foreground">New Leads</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{newLeads}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Contacted</CardTitle>
            <MessageSquare className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{contactedLeads}</div>
            <p className="text-xs text-muted-foreground">In discussion</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Converted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{convertedLeads}</div>
            <p className="text-xs text-muted-foreground">Successfully converted</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-3xl">
          <Clock className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">Loading leads details...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-20 bg-card/20 border border-dashed border-border rounded-3xl p-8 max-w-xl mx-auto flex flex-col items-center justify-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">No Leads Found</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            We couldn't find any inquiries matching your filters. Make sure your public trainers option is enabled on the profile page!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => {
            const cleanPhone = lead.client_phone ? lead.client_phone.replace(/[\s\-\(\)\+]/g, '') : '';
            const waUrl = cleanPhone 
              ? `https://wa.me/${cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(`Hi ${lead.client_name}, this is coach from Gymatrix. Thank you for your inquiry about personal training. I'd love to discuss how I can help you reach your goals!`)}`
              : '';

            return (
              <Card key={lead.id} className="border border-border/50 bg-card/30 hover:bg-card/50 hover:border-border transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    {/* Left: Info */}
                    <div className="flex gap-4 items-start min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {getInitials(lead.client_name)}
                      </div>
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-extrabold text-lg text-foreground truncate">
                            {lead.client_name}
                          </h3>
                          {getStatusBadge(lead.status)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-primary" />
                            {lead.client_email}
                          </span>
                          {lead.client_phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-primary" />
                              {lead.client_phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            {formatDate(lead.created_at)}
                          </span>
                        </div>
                        <div className="mt-3 p-4 bg-muted/40 border border-border/40 rounded-xl">
                          <p className="text-sm font-semibold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground mb-1">Goals & Inquiry Details</p>
                          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                            {lead.message}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap sm:flex-nowrap lg:flex-col gap-3 w-full lg:w-auto items-stretch lg:items-end flex-shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/40">
                      <div className="w-full sm:w-44 flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-left lg:text-right">Lead Status</span>
                        <Select 
                          value={lead.status} 
                          onValueChange={(val: Lead['status']) => handleStatusChange(lead.id, val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New Inquiry</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="converted">Converted Client</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 w-full justify-start lg:justify-end">
                        <a 
                          href={`mailto:${lead.client_email}`}
                          className="flex items-center justify-center h-10 px-3.5 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold gap-1.5 transition-all shadow-sm"
                        >
                          <Mail className="h-4 w-4" />
                          Email
                        </a>
                        {waUrl && (
                          <a 
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 transition-all shadow-sm"
                          >
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                          </a>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteLead(lead.id)}
                          className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
