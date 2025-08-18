import MerchantAmountEntry from "@/components/MerchantAmountEntry";

export default function MerchantValidation() {
  const handleTransactionScanned = (transactionId: string) => {
    console.log('Transaction scanned:', transactionId);
  };

  return (
    <div className="min-h-screen bg-background">
      <MerchantAmountEntry onTransactionScanned={handleTransactionScanned} />
    </div>
  );
}