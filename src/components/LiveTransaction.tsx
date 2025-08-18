import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, QrCode, CreditCard, DollarSign } from "lucide-react";

interface LiveTransactionProps {
  dealId: string;
  merchantId: string;
  dealTitle: string;
  dealType: 'percentage' | 'fixed';
  dealDiscountPct?: number;
  dealDiscountFixed?: number;
  onComplete: () => void;
}

interface LiveTransaction {
  id: string;
  status: string;
  qr_token: string;
  purchase_amount: number | null;
  deal_discount: number;
  credits_available_local: number;
  credits_available_network: number;
  credits_to_apply: number;
  net_amount: number | null;
  credits_enabled: boolean;
}

export default function LiveTransaction({
  dealId,
  merchantId,
  dealTitle,
  dealType,
  dealDiscountPct,
  dealDiscountFixed,
  onComplete
}: LiveTransactionProps) {
  const [transaction, setTransaction] = useState<LiveTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    createTransaction();
  }, []);

  useEffect(() => {
    if (!transaction) return;

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`transaction-${transaction.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_transactions',
          filter: `id=eq.${transaction.id}`
        },
        (payload) => {
          console.log('Transaction updated:', payload);
          setTransaction(payload.new as LiveTransaction);
          
          if (payload.new.status === 'completed') {
            toast({
              title: "Payment Complete! 🎉",
              description: "Transaction processed successfully"
            });
            setTimeout(onComplete, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transaction?.id]);

  const createTransaction = async () => {
    try {
      const qrToken = `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('live_transactions')
        .insert({
          user_id: '550e8400-e29b-41d4-a716-446655440000', // Demo user
          merchant_id: merchantId,
          deal_id: dealId,
          qr_token: qrToken,
          deal_title: dealTitle,
          deal_type: dealType,
          deal_discount_pct: dealDiscountPct,
          deal_discount_fixed: dealDiscountFixed,
          status: 'waiting_merchant_scan'
        })
        .select()
        .single();

      if (error) throw error;
      setTransaction(data);
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCredits = async () => {
    if (!transaction) return;

    try {
      const { error } = await supabase
        .from('live_transactions')
        .update({ credits_enabled: !transaction.credits_enabled })
        .eq('id', transaction.id);

      if (error) throw error;
      
      setTransaction(prev => prev ? { ...prev, credits_enabled: !prev.credits_enabled } : null);
    } catch (error) {
      console.error('Error toggling credits:', error);
      toast({
        title: "Error",
        description: "Failed to update credit settings",
        variant: "destructive"
      });
    }
  };

  const getStatusDisplay = () => {
    if (!transaction) return null;

    switch (transaction.status) {
      case 'waiting_merchant_scan':
        return (
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-4 w-4" />
            <span>Waiting for merchant to scan</span>
          </div>
        );
      case 'merchant_entering_amount':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <DollarSign className="h-4 w-4" />
            <span>Merchant entering purchase amount</span>
          </div>
        );
      case 'waiting_user_confirmation':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CreditCard className="h-4 w-4" />
            <span>Ready for payment</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Transaction completed!</span>
          </div>
        );
      default:
        return <span>Processing...</span>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="max-w-md mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Failed to create transaction</p>
            <Button onClick={createTransaction} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">{dealTitle}</h2>
        <Badge variant="outline" className="mt-2">
          {dealType === 'percentage' ? `${dealDiscountPct}% off` : `$${dealDiscountFixed} off`}
        </Badge>
      </div>

      {/* Status */}
      <Card>
        <CardContent className="p-4 text-center">
          {getStatusDisplay()}
        </CardContent>
      </Card>

      {/* Credits Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Payment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="credits-toggle" className="text-sm">
              Use Available Credits
            </Label>
            <Switch
              id="credits-toggle"
              checked={transaction.credits_enabled}
              onCheckedChange={toggleCredits}
            />
          </div>
          {transaction.credits_enabled && (
            <div className="text-xs text-muted-foreground">
              Available: ${((transaction.credits_available_local + transaction.credits_available_network)).toFixed(2)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code - Show until amount is entered */}
      {transaction.status !== 'completed' && !transaction.purchase_amount && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5" />
              Show to Merchant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG
                value={JSON.stringify({
                  type: 'live_transaction',
                  token: transaction.qr_token,
                  deal: dealTitle
                })}
                size={200}
                level="M"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Breakdown - Show when amount is entered */}
      {transaction.purchase_amount && transaction.status !== 'completed' && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-center">Payment Breakdown</CardTitle>
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
              <span>Net Amount to Pay:</span>
              <span className="text-primary">
                ${transaction.net_amount?.toFixed(2) || '0.00'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Message */}
      {transaction.status === 'completed' && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-100 mb-2">
              Payment Complete!
            </h3>
            <p className="text-green-700 dark:text-green-300">
              Transaction processed successfully
            </p>
            {transaction.credits_to_apply > 0 && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                Credits will be updated shortly
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {transaction.status === 'waiting_merchant_scan' && (
        <div className="p-4 bg-muted rounded-lg text-center">
          <h4 className="font-semibold text-sm mb-2">How it works:</h4>
          <ol className="text-xs text-muted-foreground space-y-1 text-left max-w-sm mx-auto">
            <li>1. Show QR code to merchant</li>
            <li>2. Merchant scans and enters purchase amount</li>
            <li>3. Review payment breakdown</li>
            <li>4. Complete payment for remaining balance</li>
          </ol>
        </div>
      )}
    </div>
  );
}