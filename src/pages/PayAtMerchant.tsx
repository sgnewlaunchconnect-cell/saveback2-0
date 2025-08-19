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
    
    // If this payment is related to a grab, mark it as used
    if (grabId) {
      try {
        const { error } = await supabase
          .from('grabs')
          .update({ 
            status: 'USED',
            used_at: new Date().toISOString()
          })
          .eq('id', grabId);
          
        if (error) {
          console.error('Error updating grab status:', error);
        } else {
          console.log('Grab marked as used:', grabId);
        }
      } catch (error) {
        console.error('Error updating grab:', error);
      }
    }
  };

  return <PayAtMerchantComponent onPaymentComplete={handlePaymentComplete} />;
}