import PayAtMerchantComponent from "@/components/PayAtMerchant";

export default function PayAtMerchant() {
  const handlePaymentComplete = (paymentData: {
    billAmount: number;
    creditsUsed: number;
    finalAmount: number;
    paymentCode: string;
  }) => {
    console.log("Payment completed:", paymentData);
    // Here you would typically update user credits, log the transaction, etc.
  };

  return <PayAtMerchantComponent onPaymentComplete={handlePaymentComplete} />;
}