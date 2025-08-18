import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LiveTransaction from "@/components/LiveTransaction";

export default function GrabPass() {
  const { grabId } = useParams();
  const [dealInfo, setDealInfo] = useState<{
    dealId: string;
    merchantId: string;
    dealTitle: string;
    dealType: 'percentage' | 'fixed';
    dealDiscountPct?: number;
    dealDiscountFixed?: number;
  }>({
    dealId: "demo-deal-id",
    merchantId: "demo-merchant-id", 
    dealTitle: "Coffee & Pastry Deal",
    dealType: "percentage",
    dealDiscountPct: 15
  });

  // In a real app, you'd fetch deal details from grabId
  useEffect(() => {
    if (grabId) {
      // Simulate different deal types based on grabId
      if (grabId.includes('fixed')) {
        setDealInfo({
          dealId: "demo-deal-fixed",
          merchantId: "demo-merchant-id",
          dealTitle: "Buy One Get $5 Off",
          dealType: "fixed",
          dealDiscountFixed: 5
        });
      }
    }
  }, [grabId]);

  const handleTransactionComplete = () => {
    // Navigate back to deals or show success
    window.location.href = '/deals';
  };

  return (
    <div className="min-h-screen bg-background">
      <LiveTransaction
        dealId={dealInfo.dealId}
        merchantId={dealInfo.merchantId}
        dealTitle={dealInfo.dealTitle}
        dealType={dealInfo.dealType}
        dealDiscountPct={dealInfo.dealDiscountPct}
        dealDiscountFixed={dealInfo.dealDiscountFixed}
        onComplete={handleTransactionComplete}
      />
    </div>
  );
}