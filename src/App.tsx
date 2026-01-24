import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/super-admin/Dashboard";
import Members from "./pages/super-admin/Members";
import MembershipPlans from "./pages/super-admin/MembershipPlans";
import Payments from "./pages/super-admin/Payments";
import Reports from "./pages/super-admin/Reports";
import Settings from "./pages/super-admin/Settings";
import Login from "./pages/super-admin/Login";
import ForgotPassword from "./pages/super-admin/ForgotPassword";
import NotFound from "./pages/super-admin/NotFound";

import GymLogin from "./pages/gym/GymLogin";
import GymRegister from "./pages/gym/GymRegister";
import GymDashboard from "./pages/gym/Dashboard";
import GymMembers from "./pages/gym/Members";
import GymMembershipPlans from "./pages/gym/MembershipPlans";
import GymAttendance from "./pages/gym/Attendance";
import GymStaff from "./pages/gym/Staff";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Gym Admin Routes */}
          <Route path="/" element={<GymDashboard />} />
          <Route path="/dashboard" element={<GymDashboard />} />
          <Route path="/auth" element={<GymLogin />} />
          <Route path="/auth/register" element={<GymRegister />} />

          {/* Gym Specific Routes */}
          <Route path="/members" element={<GymMembers />} />
          <Route path="/plans" element={<GymMembershipPlans />} />
          <Route path="/attendance" element={<GymAttendance />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/staff" element={<GymStaff />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />

          {/* Super Admin Routes */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/members" element={<Members />} />
          <Route path="/admin/plans" element={<MembershipPlans />} />
          <Route path="/admin/payments" element={<Payments />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/admin/forgot-password" element={<ForgotPassword />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
