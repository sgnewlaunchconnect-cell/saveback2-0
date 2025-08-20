import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PayAtMerchantComponent from "@/components/PayAtMerchant";

export default function PayAtMerchant() {
  const [searchParams] = useSearchParams();
  const grabId = searchParams.get("grabId");

  const handlePaymentComplete = async (paymentData: {
    billAmount: number;
    creditsUsed: number;
    finalAmount: number;
    paymentCode: string;
  }) => {
    console.log("Payment completed:", paymentData);
    
    // Note: Don't mark grab as used here - merchant validation will handle this
    // The payment code will be validated by the merchant using validatePendingTransaction
  };

  return <PayAtMerchantComponent onPaymentComplete={handlePaymentComplete} />;
}