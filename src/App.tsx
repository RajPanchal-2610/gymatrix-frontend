import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrivateRoute } from "./components/PrivateRoute";
import { FeatureGuard } from "./components/FeatureGuard";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { GymProvider } from "@/hooks/useGym";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { PermissionGuard } from "./components/PermissionGuard";
import Dashboard from "./pages/super-admin/Dashboard";
import Members from "./pages/super-admin/Members";
import MembershipPlans from "./pages/super-admin/MembershipPlans";
import Features from "./pages/super-admin/Features";
import Payments from "./pages/super-admin/Payments";
import Reports from "./pages/super-admin/Reports";
import Settings from "./pages/super-admin/Settings";
import Login from "./pages/super-admin/Login";
import ForgotPassword from "./pages/super-admin/ForgotPassword";
import NotFound from "./pages/super-admin/NotFound";

import GymLogin from "./pages/gym/GymLogin";
import GymRegister from "./pages/gym/GymRegister";
import GymDashboard from "./pages/gym/Dashboard";
import GymInventory from "./pages/gym/Inventory";
import GymMembers from "./pages/gym/Members";
import MemberView from "./pages/gym/Members/MemberView";
import Pricing from "./pages/gym/Pricing";
import GymAttendance from "./pages/gym/Attendance";
import GymStaff from "./pages/gym/Staff";
import GymRoles from "./pages/gym/Roles";
import GymPermissions from "./pages/gym/Permissions";
import GymMembershipPlans from "./pages/gym/MembershipPlans";
import GymPayments from "./pages/gym/Payments";
import GymDietWorkoutPlans from "./pages/gym/DietWorkoutPlans";

import { DashboardLayout } from "./components/layout/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SubscriptionProvider>
        <PermissionsProvider>
          <GymProvider>
            <BrowserRouter>
              <Routes>

                {/* Gym Admin Routes - Protected */}
                <Route element={<PrivateRoute allowedRoles={['GYM_ADMIN']} />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/" element={<GymDashboard />} />
                    <Route path="/dashboard" element={<GymDashboard />} />
                    <Route path="/members" element={
                      <PermissionGuard permission="view_members">
                        <GymMembers />
                      </PermissionGuard>
                    } />
                    <Route path="/members/:id" element={
                      <PermissionGuard permission="view_members">
                        <MemberView />
                      </PermissionGuard>
                    } />
                    <Route path="/plans" element={
                      <PermissionGuard permission="view_membership_plans">
                        <GymMembershipPlans />
                      </PermissionGuard>
                    } />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/attendance" element={
                      <PermissionGuard permission="view_attendance">
                        <GymAttendance />
                      </PermissionGuard>
                    } />
                    <Route path="/payments" element={
                      <PermissionGuard permission="view_payments">
                        <GymPayments />
                      </PermissionGuard>
                    } />
                    <Route path="/inventory" element={
                      <FeatureGuard feature="Inventory">
                        <GymInventory />
                      </FeatureGuard>
                    } />
                    <Route path="/staff" element={
                      <PermissionGuard permission="view_staff">
                        <GymStaff />
                      </PermissionGuard>
                    } />
                    <Route path="/diet-workout" element={
                      <PermissionGuard permission="view_diet_workout_plans">
                        <GymDietWorkoutPlans />
                      </PermissionGuard>
                    } />
                    <Route path="/roles" element={
                      <PermissionGuard permission="view_roles">
                        <GymRoles />
                      </PermissionGuard>
                    } />
                    <Route path="/permissions" element={
                      <PermissionGuard permission="view_permissions">
                        <GymPermissions />
                      </PermissionGuard>
                    } />
                    <Route path="/reports" element={
                      <PermissionGuard permission="view_reports">
                        <Reports />
                      </PermissionGuard>
                    } />
                    <Route path="/settings" element={
                      <PermissionGuard permission="view_gym_settings">
                        <Settings />
                      </PermissionGuard>
                    } />
                  </Route>
                </Route>

                {/* Public Gym Auth */}
                <Route path="/auth" element={<GymLogin />} />
                <Route path="/auth/register" element={<GymRegister />} />

                {/* Super Admin Routes - Protected */}
                <Route element={<PrivateRoute allowedRoles={['SUPER_ADMIN']} />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/admin/dashboard" element={<Dashboard />} />
                    <Route path="/admin/members" element={<Members />} />
                    <Route path="/admin/plans" element={<MembershipPlans />} />
                    <Route path="/admin/features" element={<Features />} />
                    <Route path="/admin/payments" element={<Payments />} />
                    <Route path="/admin/reports" element={<Reports />} />
                    <Route path="/admin/settings" element={<Settings />} />
                  </Route>
                </Route>

                {/* Public Admin Auth */}
                <Route path="/admin/login" element={<Login />} />
                <Route path="/admin/forgot-password" element={<ForgotPassword />} />


                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </GymProvider>
        </PermissionsProvider>
      </SubscriptionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
