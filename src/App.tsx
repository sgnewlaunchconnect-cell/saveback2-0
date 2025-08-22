import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthSessionGuard } from "@/components/AuthSessionGuard";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import DealDetail from "./pages/DealDetail";
import GrabPass from "./pages/GrabPass";
import Profile from "./pages/Profile";
import MerchantPortal from "./pages/MerchantPortal";
import AdminDashboard from "./pages/AdminDashboard";
import WalletPage from "./pages/WalletPage";
import PayAtMerchant from "./pages/PayAtMerchant";
import VerifyPayment from "./pages/VerifyPayment";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CustomerValidation from "./components/CustomerValidation";
import HawkerValidation from "./components/HawkerValidation";
import MerchantPage from "./pages/MerchantPage";
import Redeem from "./pages/Redeem";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthSessionGuard>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Navigation />
            <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/deals" element={<Index />} />
          <Route path="/deals/:id" element={<DealDetail />} />
          <Route path="/redeem" element={<Redeem />} />
          <Route path="/grab-pass/:grabId" element={<GrabPass />} />
          <Route path="/merchants/:merchantId" element={<MerchantPage />} />
          <Route path="/merchant/:merchantId" element={<MerchantPortal />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/pay-at-merchant" element={<PayAtMerchant />} />
          <Route path="/verify-payment" element={<VerifyPayment />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/hawker/validate" element={<HawkerValidation />} />
          <Route path="/customer/validate" element={<CustomerValidation />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
          </BrowserRouter>
        </AuthSessionGuard>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
