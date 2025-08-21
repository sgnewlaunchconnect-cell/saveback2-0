import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, Eye } from "lucide-react";
import { format } from "date-fns";

interface Settlement {
  id: string;
  merchant_id: string;
  period_start: string;
  period_end: string;
  gross_cents: number;
  fees_cents: number;
  net_cents: number;
  status: string;
  payment_method: string;
  payment_reference: string;
  admin_notes: string;
  created_at: string;
  paid_at: string;
  merchant: {
    name: string;
  } | null;
}

export function AdminSettlements() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchSettlements();
  }, []);

  const fetchSettlements = async () => {
    try {
      const { data, error } = await supabase
        .from("merchant_settlements")
        .select(`
          *,
          merchant:merchants(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSettlements(data as any || []);
    } catch (error) {
      console.error("Error fetching settlements:", error);
      toast({
        title: "Error",
        description: "Failed to fetch settlements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSettlements = async () => {
    try {
      const { error } = await supabase.functions.invoke("generateSettlements", {
        body: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settlements generated successfully",
      });

      setIsGenerateDialogOpen(false);
      fetchSettlements();
    } catch (error) {
      console.error("Error generating settlements:", error);
      toast({
        title: "Error",
        description: "Failed to generate settlements",
        variant: "destructive",
      });
    }
  };

  const markSettlementPaid = async () => {
    if (!selectedSettlement) return;

    try {
      const { error } = await supabase
        .from("merchant_settlements")
        .update({
          status: "paid",
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          admin_notes: adminNotes,
          paid_at: new Date().toISOString(),
        })
        .eq("id", selectedSettlement.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settlement marked as paid",
      });

      setIsMarkPaidDialogOpen(false);
      setSelectedSettlement(null);
      setPaymentMethod("");
      setPaymentReference("");
      setAdminNotes("");
      fetchSettlements();
    } catch (error) {
      console.error("Error marking settlement as paid:", error);
      toast({
        title: "Error",
        description: "Failed to mark settlement as paid",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Settlements</h2>
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded mb-4"></div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Settlements</h2>
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate Settlements
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Settlements</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>This will generate settlements for all merchants based on their captured transactions from the last 30 days.</p>
              <Button onClick={generateSettlements} className="w-full">
                Generate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Merchant Settlements ({settlements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Gross Amount</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.map((settlement) => (
                <TableRow key={settlement.id}>
                  <TableCell className="font-medium">{settlement.merchant?.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(settlement.period_start), "MMM dd")} - {format(new Date(settlement.period_end), "MMM dd, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>${(settlement.gross_cents / 100).toFixed(2)}</TableCell>
                  <TableCell>${(settlement.fees_cents / 100).toFixed(2)}</TableCell>
                  <TableCell className="font-medium">${(settlement.net_cents / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(settlement.status)}>
                      {settlement.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{settlement.payment_method || "-"}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {settlement.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSettlement(settlement);
                            setIsMarkPaidDialogOpen(true);
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isMarkPaidDialogOpen} onOpenChange={setIsMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Settlement as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Input
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="e.g., Bank Transfer, PayPal"
              />
            </div>
            <div>
              <Label htmlFor="paymentReference">Payment Reference</Label>
              <Input
                id="paymentReference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction ID or reference number"
              />
            </div>
            <div>
              <Label htmlFor="adminNotes">Admin Notes</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
            <Button onClick={markSettlementPaid} className="w-full">
              Mark as Paid
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}