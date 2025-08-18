import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PayAtMerchantComponent from "@/components/PayAtMerchant";

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
    dealId: "550e8400-e29b-41d4-a716-446655440001",
    merchantId: "550e8400-e29b-41d4-a716-446655440002", 
    dealTitle: "Coffee & Pastry Deal",
    dealType: "percentage",
    dealDiscountPct: 15
  });

  // Different pricing scenarios based on grabId
  useEffect(() => {
    if (grabId) {
      if (grabId.includes('high-value')) {
        setDealInfo({
          dealId: "550e8400-e29b-41d4-a716-446655440003",
          merchantId: "550e8400-e29b-41d4-a716-446655440004",
          dealTitle: "Premium Dinner Experience",
          dealType: "percentage",
          dealDiscountPct: 20
        });
      } else if (grabId.includes('fixed-discount')) {
        setDealInfo({
          dealId: "550e8400-e29b-41d4-a716-446655440005",
          merchantId: "550e8400-e29b-41d4-a716-446655440006",
          dealTitle: "Buy One Get $10 Off",
          dealType: "fixed",
          dealDiscountFixed: 10
        });
      } else if (grabId.includes('small-purchase')) {
        setDealInfo({
          dealId: "550e8400-e29b-41d4-a716-446655440007",
          merchantId: "550e8400-e29b-41d4-a716-446655440008",
          dealTitle: "Quick Snack Deal",
          dealType: "percentage",
          dealDiscountPct: 25
        });
      }
    }
  }, [grabId]);

  const handleTransactionComplete = () => {
    // Navigate back to deals or show success
    window.location.href = '/deals';
  };

  const handlePaymentComplete = (paymentData: {
    billAmount: number;
    creditsUsed: number;
    finalAmount: number;
    paymentCode: string;
  }) => {
    console.log("Payment completed for deal:", dealInfo.dealTitle, paymentData);
    // Here you would typically update user credits, log the transaction, etc.
    setTimeout(() => {
      window.location.href = '/deals';
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <PayAtMerchantComponent onPaymentComplete={handlePaymentComplete} />
    </div>
  );
}