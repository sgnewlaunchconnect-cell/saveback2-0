import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Scan, DollarSign, Calculator, CheckCircle } from "lucide-react";

interface MerchantAmountEntryProps {
  onTransactionScanned: (transactionId: string) => void;
}

interface ScannedTransaction {
  id: string;
  deal_title: string;
  deal_type: string;
  deal_discount_pct: number | null;
  deal_discount_fixed: number | null;
  credits_enabled: boolean;
  purchase_amount: number | null;
  deal_discount: number;
  credits_to_apply: number;
  net_amount: number | null;
  status: string;
}

export default function MerchantAmountEntry({ onTransactionScanned }: MerchantAmountEntryProps) {
  const [qrInput, setQrInput] = useState("");
  const [transaction, setTransaction] = useState<ScannedTransaction | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!transaction) return;

    // Subscribe to real-time updates for this transaction
    const channel = supabase
      .channel(`merchant-transaction-${transaction.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_transactions',
          filter: `id=eq.${transaction.id}`
        },
        (payload) => {
          console.log('Merchant: Transaction updated:', payload);
          setTransaction(payload.new as ScannedTransaction);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transaction?.id]);

  const handleScanQR = async () => {
    if (!qrInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter QR code data",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let qrData;
      try {
        qrData = JSON.parse(qrInput);
      } catch {
        // Try as plain token
        qrData = { token: qrInput };
      }

      const { data, error } = await supabase
        .from('live_transactions')
        .select('*')
        .eq('qr_token', qrData.token)
        .eq('status', 'waiting_merchant_scan')
        .single();

      if (error || !data) {
        toast({
          title: "Invalid QR Code",
          description: "Transaction not found or already processed",
          variant: "destructive"
        });
        return;
      }

      // Update status to merchant scanning
      const { error: updateError } = await supabase
        .from('live_transactions')
        .update({ status: 'merchant_entering_amount' })
        .eq('id', data.id);

      if (updateError) throw updateError;

      setTransaction(data);
      onTransactionScanned(data.id);
      
      toast({
        title: "QR Code Scanned!",
        description: `Deal: ${data.deal_title}`
      });
    } catch (error) {
      console.error('Error scanning QR:', error);
      toast({
        title: "Error",
        description: "Failed to scan QR code",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = async () => {
    if (!transaction || !amount) return;

    const purchaseAmount = parseFloat(amount);
    if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid purchase amount",
        variant: "destructive"
      });
      return;
    }

    setCalculating(true);
    try {
      // Call the calculation function
      const { error } = await supabase.rpc('calculate_transaction_totals', {
        p_transaction_id: transaction.id,
        p_purchase_amount: purchaseAmount
      });

      if (error) throw error;

      // Update status to waiting for user confirmation
      const { error: statusError } = await supabase
        .from('live_transactions')
        .update({ status: 'waiting_user_confirmation' })
        .eq('id', transaction.id);

      if (statusError) throw statusError;

      toast({
        title: "Amount Calculated",
        description: "Customer can now review the payment"
      });
    } catch (error) {
      console.error('Error calculating total:', error);
      toast({
        title: "Calculation Error",
        description: "Failed to calculate transaction total",
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  };

  const completeTransaction = async () => {
    if (!transaction) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('live_transactions')
        .update({ status: 'completed' })
        .eq('id', transaction.id);

      if (error) throw error;

      toast({
        title: "Transaction Complete! 🎉",
        description: "Payment has been processed"
      });

      // Reset for next transaction
      setTimeout(() => {
        setTransaction(null);
        setQrInput("");
        setAmount("");
      }, 3000);
    } catch (error) {
      console.error('Error completing transaction:', error);
      toast({
        title: "Error",
        description: "Failed to complete transaction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (transaction && transaction.status === 'completed') {
    return (
      <div className="max-w-md mx-auto p-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-100 mb-2">
              Transaction Complete!
            </h3>
            <p className="text-green-700 dark:text-green-300">
              Payment processed successfully
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Merchant Terminal</h2>
        <p className="text-muted-foreground">Scan customer QR and process payment</p>
      </div>

      {!transaction ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Scan Customer QR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="qr-input">QR Code Data</Label>
              <Input
                id="qr-input"
                placeholder="Scan or enter QR code data"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScanQR()}
              />
            </div>
            <Button 
              onClick={handleScanQR} 
              disabled={loading || !qrInput.trim()}
              className="w-full"
            >
              {loading ? "Scanning..." : "Scan QR Code"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Deal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">{transaction.deal_title}</CardTitle>
              <div className="text-center">
                <Badge variant="outline">
                  {transaction.deal_type === 'percentage' 
                    ? `${transaction.deal_discount_pct}% off` 
                    : `$${transaction.deal_discount_fixed} off`}
                </Badge>
                {transaction.credits_enabled && (
                  <Badge variant="secondary" className="ml-2">
                    Credits: Enabled
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Amount Entry */}
          {!transaction.purchase_amount && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Enter Purchase Amount
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount">Total Purchase Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && calculateTotal()}
                  />
                </div>
                <Button 
                  onClick={calculateTotal}
                  disabled={calculating || !amount}
                  className="w-full"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {calculating ? "Calculating..." : "Calculate Total"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Payment Summary */}
          {transaction.purchase_amount && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-center">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Purchase Amount:</span>
                    <span className="font-medium">${transaction.purchase_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Deal Discount:</span>
                    <span className="font-medium">-${transaction.deal_discount.toFixed(2)}</span>
                  </div>
                  {transaction.credits_enabled && transaction.credits_to_apply > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Credits Applied:</span>
                      <span className="font-medium">-${transaction.credits_to_apply.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Customer Pays:</span>
                  <span className="text-primary">
                    ${transaction.net_amount?.toFixed(2) || '0.00'}
                  </span>
                </div>
                
                {transaction.status === 'waiting_user_confirmation' && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Customer is reviewing payment details
                    </p>
                    <Button onClick={completeTransaction} disabled={loading} className="w-full">
                      {loading ? "Processing..." : "Confirm Payment Received"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}