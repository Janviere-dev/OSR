import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ParentDashboard from "./pages/ParentDashboard";
import SchoolDashboard from "./pages/SchoolDashboard";
import SchoolSettings from "./pages/SchoolSettings";
import PaymentCallback from "./pages/PaymentCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="/school" element={<SchoolDashboard />} />
              <Route path="/school/applications" element={<SchoolDashboard />} />
              <Route path="/school/students" element={<SchoolDashboard />} />
              <Route path="/school/settings" element={<SchoolSettings />} />
              <Route path="/payment/callback" element={<PaymentCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
