import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Profile from "./pages/Profile";
import Transactions from "./pages/Transactions";
import PaymentCallback from "./pages/PaymentCallback";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Esim from "./pages/Esim";
import ProductDetail from "./pages/ProductDetail";
import Orders from "./pages/Orders";
import TopUp from "./pages/TopUp";
import VpnAndProxy from "./pages/VpnAndProxy";
import ProviderProducts from "./pages/ProviderProducts";
import EsimCategories from "./pages/EsimCategories";
import EsimCategoryProducts from "./pages/EsimCategoryProducts";
import SMS from "./pages/SMS";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/esim" element={<Esim />} />
            <Route path="/esim-categories" element={<EsimCategories />} />
            <Route path="/esim-category/:category" element={<EsimCategoryProducts />} />
            <Route path="/vpn-and-proxy" element={<VpnAndProxy />} />
            <Route path="/sms" element={<SMS />} />
            <Route path="/provider/:provider" element={<ProviderProducts />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/top-up" element={<TopUp />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/payment-callback" element={<PaymentCallback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
