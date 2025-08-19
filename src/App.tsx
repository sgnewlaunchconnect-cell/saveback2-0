import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import Deals from "./pages/Deals";
import DealDetail from "./pages/DealDetail";
import GrabPass from "./pages/GrabPass";
import MerchantValidation from "./pages/MerchantValidation";
import Profile from "./pages/Profile";
import MerchantDashboard from "./pages/MerchantDashboard";
import MerchantDemo from "./pages/MerchantDemo";
import DemoScenarios from "./pages/DemoScenarios";
import WalletPage from "./pages/WalletPage";
import PayAtMerchant from "./pages/PayAtMerchant";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CustomerValidation from "./components/CustomerValidation";
import HawkerValidation from "./components/HawkerValidation";
import MerchantPage from "./pages/MerchantPage";
import Redeem from "./pages/Redeem";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/deals/:id" element={<DealDetail />} />
          <Route path="/redeem" element={<Redeem />} />
          <Route path="/demo-scenarios" element={<DemoScenarios />} />
          <Route path="/grab-pass/:grabId" element={<GrabPass />} />
          <Route path="/merchant/:merchantId" element={<MerchantPage />} />
          <Route path="/merchant/validate" element={<Navigate to="/hawker/validate" replace />} />
          <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
          <Route path="/merchant/demo" element={<MerchantDemo />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/pay" element={<PayAtMerchant />} />
          <Route path="/hawker/validate" element={<HawkerValidation />} />
          <Route path="/customer/validate" element={<CustomerValidation />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
