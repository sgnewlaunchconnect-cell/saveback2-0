import { AdminOverview } from "./sections/AdminOverview";
import { AdminUsers } from "./sections/AdminUsers";
import { AdminMerchants } from "./sections/AdminMerchants";
import { AdminTransactions } from "./sections/AdminTransactions";
import { AdminSettlements } from "./sections/AdminSettlements";
import { AdminReviewFlags } from "./sections/AdminReviewFlags";

interface AdminContentProps {
  activeSection: string;
}

export function AdminContent({ activeSection }: AdminContentProps) {
  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <AdminOverview />;
      case "users":
        return <AdminUsers />;
      case "merchants":
        return <AdminMerchants />;
      case "transactions":
        return <AdminTransactions />;
      case "settlements":
        return <AdminSettlements />;
      case "reviews":
        return <AdminReviewFlags />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <main className="flex-1 p-6">
      {renderSection()}
    </main>
  );
}