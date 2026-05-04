import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";

// Pages
import Landing from "./pages/Landing";
import RoleSelect from "./pages/RoleSelect";
import Login from "./pages/Login";
import Signup from "./pages/SignUp";
import VerifyEmail from "./pages/VerifyEmail";
import CompleteProfile from "./pages/CompleteProfile";
import VendorDashboard from "./pages/vendor/Dashboard";
import VendorOrders from "./pages/vendor/Orders";
import VendorMenu from "./pages/vendor/Menu";
import VendorMenuSetup from "./pages/vendor/MenuSetup";
import CustomerVendors from "./pages/customer/Vendors";
import CustomerVendorMenu from "./pages/customer/VendorMenu";
import CustomerCheckout from "./pages/customer/Checkout";
import CustomerOrders from "./pages/customer/Orders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({
  children,
  requiredRole
}: {
  children: React.ReactNode,
  requiredRole?: 'vendor' | 'customer'
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/role-select" element={<RoleSelect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />

            {/* Vendor Routes (Protected) */}
            <Route
              path="/vendor/menu"
              element={
                <ProtectedRoute requiredRole="vendor">
                  <VendorMenu />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/orders"
              element={
                <ProtectedRoute requiredRole="vendor">
                  <VendorOrders />
                </ProtectedRoute>
              }
            />
            {/* Redirect old vendor routes to menu */}
            <Route path="/vendor/menu-setup" element={<Navigate to="/vendor/menu" replace />} />
            <Route path="/vendor/dashboard" element={<Navigate to="/vendor/menu" replace />} />
            <Route path="/vendor/history" element={<Navigate to="/vendor/orders" replace />} />
            
            {/* Customer Routes (Protected) */}
            <Route 
              path="/customer/vendors" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerVendors />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customer/menu/:vendorId" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerVendorMenu />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customer/checkout" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerCheckout />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customer/orders" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerOrders />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/customer/cart" 
              element={
                <ProtectedRoute requiredRole="customer">
                  <CustomerCheckout />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;