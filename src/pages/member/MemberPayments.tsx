import { useState } from "react";
import {
  Receipt,
  CreditCard,
  Clock,
  FileText,
  Printer,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Building2,
  Smartphone,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useMemberPortal } from "./MemberLayout";
import { memberAuthService } from "@/services/memberAuthService";
import { cn } from "@/lib/utils";

export default function MemberPayments() {
  const { member, dashboardData } = useMemberPortal();
  const paymentsList = dashboardData?.payments || [];
  const memberInfo = dashboardData?.member;
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // UPI Payment Modal State
  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean;
    amount: number;
    invoiceId?: number;
    planName?: string;
  } | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [qrTab, setQrTab] = useState<"dynamic" | "standee">("dynamic");
  const [utrNumber, setUtrNumber] = useState("");
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);
  const [utrSubmitted, setUtrSubmitted] = useState(false);

  // Retrieve gym UPI settings
  const upiSettings = member?.upi_settings || dashboardData?.member?.gyms?.notification_settings?.upi_settings;
  const upiId = (upiSettings?.upi_id || "").trim();
  const upiName = (upiSettings?.upi_name || member?.gym_name || "Gymatrix Gym").trim();
  const customQrUrl = upiSettings?.qr_url || "";

  // Totals
  const totalBilled = paymentsList.reduce((acc: number, p: any) => acc + (Number(p.total_amount) || 0), 0);
  const totalPaid = paymentsList.reduce((acc: number, p: any) => acc + (Number(p.paid_amount) || 0), 0);
  const totalDue = paymentsList.reduce((acc: number, p: any) => acc + (Number(p.due_amount) || 0), 0);

  // Handle Copy UPI
  const handleCopyUpi = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Build standard NPCI UPI URI
  const modalAmount = paymentModalState?.amount || 0;
  const modalPlan = paymentModalState?.planName || member?.plan_name || "Gym Membership";
  const upiNote = `Gym Fee - ${modalPlan}`;
  const dynamicUpiUri = upiId
    ? modalAmount > 0
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${modalAmount}&cu=INR&tn=${encodeURIComponent(upiNote)}`
      : `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&cu=INR&tn=${encodeURIComponent(upiNote)}`
    : "";

  const openPaymentModal = (amount: number, invoiceId?: number, planName?: string) => {
    setPaymentModalState({
      isOpen: true,
      amount,
      invoiceId,
      planName,
    });
    setUtrNumber("");
    setUtrSubmitted(false);
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = utrNumber.trim();
    if (!clean) {
      toast.error("Please enter the 12-digit UPI reference (UTR) number");
      return;
    }
    if (clean.length < 6) {
      toast.error("Please enter a valid reference / UTR number");
      return;
    }

    setIsSubmittingUtr(true);
    try {
      await memberAuthService.submitPaymentReference({
        invoiceId: paymentModalState?.invoiceId,
        amount: modalAmount,
        utrNumber: clean,
        planName: modalPlan,
      });
      setUtrSubmitted(true);
      toast.success("Payment reference submitted! Gym management has been notified to verify and approve it.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit payment reference");
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Payments & Invoices</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Review your subscription bills, transaction history, and official gym receipts
        </p>
      </div>

      {/* Outstanding Dues Banner */}
      {totalDue > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                Outstanding Membership Dues: <span className="text-amber-500 font-extrabold">₹{totalDue.toLocaleString()}</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scan the gym's UPI QR code to settle your payment quickly and avoid subscription interruption.
              </p>
            </div>
          </div>
          <Button
            onClick={() =>
              openPaymentModal(
                totalDue,
                undefined,
                memberInfo?.gym_membership_plans?.name || member?.plan_name || "Gym Membership"
              )
            }
            className="gradient-primary gap-2 h-9 text-xs sm:text-sm font-semibold shrink-0 shadow-sm"
          >
            <QrCode className="h-4 w-4" />
            Pay via UPI / QR
          </Button>
        </div>
      )}

      {/* Payment Summary Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Billed</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">
                ₹{totalBilled.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-500 mt-1">
                ₹{totalPaid.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Outstanding Dues</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-500 mt-1">
                ₹{totalDue.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Membership Invoices & Receipts</CardTitle>
              <CardDescription>
                Detailed breakdown of all subscription fees and recorded transactions
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              {paymentsList.length} Invoices
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {paymentsList.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-semibold">No payment invoices found</p>
              <p className="text-xs text-muted-foreground">
                Invoices generated by your gym will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentsList.map((pay: any) => {
                const planName =
                  pay.gym_membership_history?.gym_membership_plans?.name ||
                  pay.remarks ||
                  "Gym Membership";
                const invoiceDate = new Date(pay.created_at).toLocaleDateString();
                const dueDate = pay.billing_date
                  ? new Date(pay.billing_date).toLocaleDateString()
                  : null;
                const isFullyPaid =
                  pay.payment_status === "paid" || Number(pay.due_amount || 0) <= 0;
                const dueAmount = Number(pay.due_amount || 0);

                return (
                  <div
                    key={pay.id}
                    className="p-4 sm:p-5 rounded-xl border border-border/80 bg-card/60 hover:border-primary/40 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          #{pay.id}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm sm:text-base text-foreground">
                            {planName}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Invoice Date: {invoiceDate}
                            {dueDate ? ` • Due Date: ${dueDate}` : ""} • ID: INV-{String(pay.id).padStart(5, "0")}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize text-xs font-semibold px-2.5 py-0.5",
                            isFullyPaid
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                              : pay.payment_status === "partial"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                : "bg-destructive/10 text-destructive border-destructive/30"
                          )}
                        >
                          {pay.payment_status?.toUpperCase() || (isFullyPaid ? "PAID" : "UNPAID")}
                        </Badge>

                        {/* Pay Due Button on invoice if balance pending */}
                        {!isFullyPaid && dueAmount > 0 && (
                          <Button
                            size="sm"
                            onClick={() => openPaymentModal(dueAmount, pay.id, planName)}
                            className="h-8 text-xs gap-1.5 gradient-primary"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            Pay ₹{dueAmount.toLocaleString()}
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(pay)}
                          className="h-8 text-xs gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View Receipt
                        </Button>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Total Fee</p>
                        <p className="font-bold text-sm text-foreground mt-0.5">
                          ₹{Number(pay.total_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amount Paid</p>
                        <p className="font-bold text-sm text-emerald-500 mt-0.5">
                          ₹{Number(pay.paid_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Due Balance</p>
                        <p
                          className={cn(
                            "font-bold text-sm mt-0.5",
                            dueAmount > 0 ? "text-amber-500" : "text-muted-foreground"
                          )}
                        >
                          ₹{dueAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Plan Duration</p>
                        <p className="font-medium text-foreground mt-0.5 truncate">
                          {pay.gym_membership_history?.start_date && pay.gym_membership_history?.end_date
                            ? `${pay.gym_membership_history.start_date} → ${pay.gym_membership_history.end_date}`
                            : "Active Duration"}
                        </p>
                      </div>
                    </div>

                    {/* Payment Transactions Sub-list */}
                    {pay.gym_payment_transactions && pay.gym_payment_transactions.length > 0 && (
                      <div className="pt-2 border-t border-border/40 text-xs space-y-1.5">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Recorded Transactions:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {pay.gym_payment_transactions.map((txn: any) => (
                            <div
                              key={txn.id}
                              className="px-2.5 py-1 rounded-md bg-muted/50 border border-border flex items-center gap-2 text-[11px]"
                            >
                              <span className="font-bold text-emerald-500">
                                ₹{Number(txn.amount || 0).toLocaleString()}
                              </span>
                              <span className="text-muted-foreground">via {txn.payment_mode || "Direct"}</span>
                              {txn.transaction_reference && (
                                <span className="font-mono font-bold text-primary">
                                  UTR: {txn.transaction_reference}
                                </span>
                              )}
                              {txn.paid_at && (
                                <span className="text-muted-foreground font-mono">
                                  ({new Date(txn.paid_at).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* UPI QR Payment Modal */}
      <Dialog
        open={!!paymentModalState?.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentModalState(null);
            setUtrNumber("");
            setUtrSubmitted(false);
          }
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md p-0 overflow-hidden bg-card border border-border max-h-[90vh] flex flex-col rounded-2xl mx-auto my-auto shadow-2xl">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <QrCode className="h-5 w-5" />
              </div>
              <div className="min-w-0 pr-6">
                <DialogTitle className="text-sm sm:text-base font-bold truncate">
                  UPI Payment & QR Code
                </DialogTitle>
                <p className="text-xs text-muted-foreground truncate">
                  {member?.gym_name} • {modalPlan}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
            {/* If gym hasn't set up UPI ID or custom QR */}
            {!upiId && !customQrUrl ? (
              <div className="text-center py-6 space-y-3">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm">UPI Payment Not Yet Set Up</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Your gym has not yet configured their online UPI payment details. Please settle your fee of ₹{modalAmount.toLocaleString()} directly at the gym reception desk.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentModalState(null)}
                  className="text-xs mt-2"
                >
                  Close
                </Button>
              </div>
            ) : (
              <>
                {/* Amount to pay */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Amount Due
                    </p>
                    <p className="text-xl sm:text-2xl font-black text-primary">
                      ₹{modalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground font-medium block truncate max-w-[150px]">
                      {modalPlan}
                    </span>
                  </div>
                </div>

                {/* Tab switch between Dynamic QR and Custom Standee if both exist */}
                {upiId && customQrUrl && (
                  <div className="flex items-center justify-center p-1 bg-muted rounded-lg">
                    <button
                      type="button"
                      onClick={() => setQrTab("dynamic")}
                      className={cn(
                        "flex-1 py-1 text-xs font-semibold rounded-md transition-all",
                        qrTab === "dynamic"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Instant Amount QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrTab("standee")}
                      className={cn(
                        "flex-1 py-1 text-xs font-semibold rounded-md transition-all",
                        qrTab === "standee"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Gym Physical Standee
                    </button>
                  </div>
                )}

                {/* QR Display Container */}
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-border bg-white text-gray-900 shadow-sm text-center">
                  {qrTab === "standee" && customQrUrl ? (
                    <div className="space-y-2">
                      <img
                        src={customQrUrl}
                        alt="Gym QR Standee"
                        className="max-h-[180px] sm:max-h-[220px] w-auto mx-auto object-contain rounded-lg"
                      />
                      <p className="text-[11px] sm:text-xs font-medium text-gray-600">
                        Scan with any UPI App
                      </p>
                    </div>
                  ) : upiId ? (
                    <div className="space-y-2">
                      <div className="p-2 inline-block bg-white rounded-lg">
                        <QRCodeSVG
                          value={dynamicUpiUri}
                          size={165}
                          className="w-[145px] h-[145px] sm:w-[170px] sm:h-[170px]"
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                      <div className="px-1">
                        <p className="font-bold text-xs text-gray-800 truncate max-w-[200px] sm:max-w-[240px] mx-auto">
                          {upiName}
                        </p>
                        <p className="text-[11px] text-gray-500 font-mono truncate max-w-[200px] sm:max-w-[240px] mx-auto">
                          {upiId}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={customQrUrl}
                      alt="Gym QR Standee"
                      className="max-h-[180px] sm:max-h-[220px] w-auto mx-auto object-contain rounded-lg"
                    />
                  )}
                </div>

                {/* UPI ID Copy Card */}
                {upiId && (
                  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg border border-border/80 bg-muted/40 text-xs gap-2">
                    <div className="truncate pr-1 flex-1 min-w-0">
                      <span className="text-[9.5px] uppercase font-bold text-muted-foreground block">
                        Payee UPI VPA:
                      </span>
                      <span className="font-mono font-semibold text-foreground truncate block text-xs">
                        {upiId}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyUpi}
                      className="h-7 text-xs gap-1 shrink-0 px-2 sm:px-3"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* UTR / Transaction Reference Submission Form */}
                <div className="pt-2 border-t border-border/60">
                  {utrSubmitted ? (
                    <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1 animate-in fade-in-50">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Reference Number Submitted!
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        UTR: <span className="text-foreground font-bold">{utrNumber}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        The gym owner has been notified. Once verified against their bank statement, your invoice receipt will automatically update to paid.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitUtr} className="space-y-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="utrNumber" className="text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-0.5">
                          <span>Enter UPI Reference / UTR Number:</span>
                          <span className="text-[10px] text-muted-foreground font-normal">12-digit number from payment receipt</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="utrNumber"
                            type="text"
                            placeholder="e.g. 432156789012"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value)}
                            className="h-9 text-xs font-mono flex-1 min-w-0"
                            disabled={isSubmittingUtr}
                          />
                          <Button
                            type="submit"
                            disabled={isSubmittingUtr || !utrNumber.trim()}
                            className="gradient-primary h-9 text-xs font-semibold shrink-0 gap-1.5 px-3"
                          >
                            {isSubmittingUtr ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span className="hidden sm:inline">Submitting...</span>
                              </>
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5" />
                                Submit Proof
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-[10.5px] sm:text-[11px] text-muted-foreground leading-relaxed">
                        After transferring fee via Google Pay, PhonePe, or Paytm, enter the 12-digit transaction ID (UTR) above so the gym owner can confirm and approve your invoice.
                      </p>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Receipt Modal Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg p-0 overflow-hidden bg-card border border-border max-h-[90vh] flex flex-col rounded-2xl mx-auto my-auto shadow-2xl">
          {selectedInvoice && (
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 overscroll-contain">
              {/* Receipt Header */}
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white p-1 border border-border flex items-center justify-center shadow-sm">
                    <img
                      src={member?.gym_logo || "/logo.png"}
                      alt="Gym"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">{member?.gym_name}</h3>
                    <p className="text-xs text-muted-foreground">{member?.gym_address || "Fitness Center"}</p>
                    {member?.gym_phone && (
                      <p className="text-[11px] text-muted-foreground">Tel: {member.gym_phone}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="font-mono text-xs">
                    INV-{String(selectedInvoice.id).padStart(5, "0")}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Invoice Date: {new Date(selectedInvoice.created_at).toLocaleDateString()}
                  </p>
                  {selectedInvoice.billing_date && (
                    <p className="text-[11px] font-medium text-foreground mt-0.5">
                      Due Date: {new Date(selectedInvoice.billing_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Billed To Member */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground uppercase font-mono text-[10px]">Billed To</span>
                  <p className="font-bold text-sm text-foreground mt-0.5">{memberInfo?.full_name}</p>
                  <p className="text-muted-foreground">{memberInfo?.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground uppercase font-mono text-[10px]">Payment Status</span>
                  <div className="mt-1">
                    <Badge
                      className={cn(
                        "text-xs font-bold uppercase",
                        selectedInvoice.payment_status === "paid" || Number(selectedInvoice.due_amount || 0) <= 0
                          ? "bg-emerald-500 text-white"
                          : selectedInvoice.payment_status === "partial"
                            ? "bg-amber-500 text-white"
                            : "bg-destructive text-white"
                      )}
                    >
                      {selectedInvoice.payment_status || "PAID"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="border rounded-lg overflow-hidden text-xs">
                <div className="bg-muted px-4 py-2 font-bold text-muted-foreground flex justify-between">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between font-semibold text-sm">
                    <span>
                      {selectedInvoice.gym_membership_history?.gym_membership_plans?.name ||
                        selectedInvoice.remarks ||
                        "Gym Membership Plan"}
                    </span>
                    <span>₹{Number(selectedInvoice.total_amount || 0).toLocaleString()}</span>
                  </div>
                  {selectedInvoice.gym_membership_history?.start_date && (
                    <p className="text-muted-foreground text-[11px]">
                      Validity: {selectedInvoice.gym_membership_history.start_date} to{" "}
                      {selectedInvoice.gym_membership_history.end_date}
                    </p>
                  )}
                </div>
                <div className="bg-muted/30 px-4 py-3 border-t border-border space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Amount Billed</span>
                    <span>₹{Number(selectedInvoice.total_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-500">
                    <span>Amount Received</span>
                    <span>- ₹{Number(selectedInvoice.paid_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-border">
                    <span>Balance Due</span>
                    <span className={Number(selectedInvoice.due_amount || 0) > 0 ? "text-amber-500" : "text-muted-foreground"}>
                      ₹{Number(selectedInvoice.due_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-between items-center pt-2 border-t border-border">
                {Number(selectedInvoice.due_amount || 0) > 0 ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const due = Number(selectedInvoice.due_amount);
                      const pName =
                        selectedInvoice.gym_membership_history?.gym_membership_plans?.name ||
                        selectedInvoice.remarks ||
                        "Gym Membership";
                      setSelectedInvoice(null);
                      openPaymentModal(due, selectedInvoice.id, pName);
                    }}
                    className="gap-1.5 text-xs gradient-primary"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Pay Due via QR
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
                    <Printer className="h-3.5 w-3.5" />
                    Print Receipt
                  </Button>
                  <Button size="sm" onClick={() => setSelectedInvoice(null)} className="text-xs">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
