import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/currency';
import { useRealtimePendingTransaction } from '@/hooks/useRealtimePendingTransaction';

interface MerchantLivePanelProps {
  paymentCode: string;
  originalAmount: number;
  finalAmount: number;
  discountApplied?: number;
}

export function MerchantLivePanel({
  paymentCode,
  originalAmount,
  finalAmount,
  discountApplied = 0
}: MerchantLivePanelProps) {
  const { transaction } = useRealtimePendingTransaction(paymentCode);

  if (!transaction) {
    return null;
  }

  const selectedLocalCredits = transaction.customer_selected_local_credits || 0;
  const selectedNetworkCredits = transaction.customer_selected_network_credits || 0;
  const totalCreditsSelected = selectedLocalCredits + selectedNetworkCredits;
  const liveNetAmount = transaction.live_net_amount || finalAmount;
  const effectiveBill = finalAmount || originalAmount;

  return (
    <Card className="border-l-4 border-l-primary bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            LIVE
          </Badge>
          Net to Collect
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Original Bill</p>
            <p className="font-medium">{formatCurrency(originalAmount)}</p>
          </div>
          
          {discountApplied > 0 && (
            <div>
              <p className="text-muted-foreground">Deal Discount</p>
              <p className="font-medium text-green-600">{formatCurrency(-discountApplied)}</p>
            </div>
          )}
          
          <div>
            <p className="text-muted-foreground">Effective Bill</p>
            <p className="font-medium">{formatCurrency(effectiveBill)}</p>
          </div>
          
          <div>
            <p className="text-muted-foreground">Credits Selected</p>
            <div className="space-y-1">
              <p className="text-xs text-blue-600">Local: {formatCurrency(selectedLocalCredits)}</p>
              <p className="text-xs text-purple-600">Network: {formatCurrency(selectedNetworkCredits)}</p>
              <p className="font-medium">Total: {formatCurrency(totalCreditsSelected)}</p>
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Net to Collect</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(liveNetAmount)}</p>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Updates live as customer selects credits. Final amount confirmed after customer payment.
        </p>
      </CardContent>
    </Card>
  );
}