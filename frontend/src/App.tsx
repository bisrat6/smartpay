import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import EmployerDashboard from "./pages/employer/EmployerDashboard";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import CompanyManagement from "./pages/employer/CompanyManagement";
import EmployeesManagement from "./pages/employer/EmployeesManagement";
import TimeLogsManagement from "./pages/employer/TimeLogsManagement";
import PaymentsManagement from "./pages/employer/PaymentsManagement";
import Analytics from "./pages/employer/Analytics";
import TimeLogs from "./pages/employee/TimeLogs";
import Payments from "./pages/employee/Payments";
import ProtectedRoute from "./components/ProtectedRoute";
import { isAuthenticated, getCurrentUser } from "./lib/auth";

const queryClient = new QueryClient();

const App = () => {
  const user = getCurrentUser();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              isAuthenticated() 
                ? <Navigate to={user?.role === 'employer' ? '/employer' : '/employee'} replace />
                : <Index />
            } />
            
            {/* Auth Routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            
            {/* Employer Routes */}
            <Route path="/employer" element={
              <ProtectedRoute requiredRole="employer">
                <EmployerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/employer/company" element={
              <ProtectedRoute requiredRole="employer">
                <CompanyManagement />
              </ProtectedRoute>
            } />
            <Route path="/employer/employees" element={
              <ProtectedRoute requiredRole="employer">
                <EmployeesManagement />
              </ProtectedRoute>
            } />
            <Route path="/employer/timelogs" element={
              <ProtectedRoute requiredRole="employer">
                <TimeLogsManagement />
              </ProtectedRoute>
            } />
            <Route path="/employer/payments" element={
              <ProtectedRoute requiredRole="employer">
                <PaymentsManagement />
              </ProtectedRoute>
            } />
            <Route path="/employer/analytics" element={
              <ProtectedRoute requiredRole="employer">
                <Analytics />
              </ProtectedRoute>
            } />
            
            {/* Employee Routes */}
            <Route path="/employee" element={
              <ProtectedRoute requiredRole="employee">
                <EmployeeDashboard />
              </ProtectedRoute>
            } />
            <Route path="/employee/logs" element={
              <ProtectedRoute requiredRole="employee">
                <TimeLogs />
              </ProtectedRoute>
            } />
            <Route path="/employee/payments" element={
              <ProtectedRoute requiredRole="employee">
                <Payments />
              </ProtectedRoute>
            } />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
