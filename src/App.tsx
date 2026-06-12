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
import SuperAdminSettings from "./pages/super-admin/Settings";
import ContactMessages from "./pages/super-admin/ContactMessages";
import Coupons from "./pages/super-admin/Coupons";
import GymSettings from "./pages/gym/Settings";
import GymProfile from "./pages/gym/Profile";
import Login from "./pages/super-admin/Login";
import ForgotPassword from "./pages/super-admin/ForgotPassword";
import ResetPassword from "./pages/super-admin/ResetPassword";
import NotFound from "./pages/super-admin/NotFound";

import GymLogin from "./pages/gym/GymLogin";
import GymRegister from "./pages/gym/GymRegister";
import GymForgotPassword from "./pages/gym/GymForgotPassword";
import GymResetPassword from "./pages/gym/GymResetPassword";
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
import GymReports from "./pages/gym/Reports";
import RevenueCollectionReport from "./pages/gym/reports/RevenueCollectionReport";
import PlanAnalysisReport from "./pages/gym/reports/PlanAnalysisReport";
import MembershipLifecycleReport from "./pages/gym/reports/MembershipLifecycleReport";
import GymTournaments from "./pages/gym/Tournaments";
import GymTournamentDetail from "./pages/gym/TournamentDetail";
import GymNotifications from "./pages/gym/Notifications";
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
                      <FeatureGuard feature="Member Management">
                        <PermissionGuard permission="view_members">
                          <GymMembers />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                    <Route path="/members/:id" element={
                      <FeatureGuard feature="Member Management">
                        <PermissionGuard permission="view_members">
                          <MemberView />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                    <Route path="/plans" element={
                      <FeatureGuard feature="Membership Plans">
                        <PermissionGuard permission="view_membership_plans">
                          <GymMembershipPlans />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/attendance" element={
                      <FeatureGuard feature="Access Control">
                        <GymAttendance />
                      </FeatureGuard>
                    } />
                    <Route path="/payments" element={
                      <FeatureGuard feature="Payments & Billing">
                        <PermissionGuard permission="view_payments">
                          <GymPayments />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                    <Route path="/inventory" element={
                      <FeatureGuard feature="Inventory Control">
                        <GymInventory />
                      </FeatureGuard>
                    } />
                    <Route path="/staff" element={
                      <FeatureGuard feature="Staff & HR">
                        <PermissionGuard permission="view_staff">
                          <GymStaff />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                    <Route path="/diet-workout" element={
                      <FeatureGuard feature="Diet & Workout Plans">
                        <PermissionGuard permission="view_diet_workout_plans">
                          <GymDietWorkoutPlans />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                    <Route path="/roles" element={
                      <FeatureGuard feature="Access Control">
                        <PermissionGuard permission="view_roles">
                          <GymRoles />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />

                    <Route path="/reports" element={
                      <FeatureGuard feature="Reports & Analytics">
                        <PermissionGuard permission="view_reports">
                          <GymReports />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                    <Route path="/reports/collection" element={
                      <FeatureGuard feature="Reports & Analytics">
                        <PermissionGuard permission="view_reports">
                          <RevenueCollectionReport />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                    <Route path="/reports/plans" element={
                      <FeatureGuard feature="Reports & Analytics">
                        <PermissionGuard permission="view_reports">
                          <PlanAnalysisReport />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                    <Route path="/reports/lifecycle" element={
                      <FeatureGuard feature="Reports & Analytics">
                        <PermissionGuard permission="view_reports">
                          <MembershipLifecycleReport />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                    <Route path="/settings" element={
                      <FeatureGuard feature="Gym Settings">
                        <PermissionGuard permission="view_gym_settings">
                          <GymSettings />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                    <Route path="/notifications" element={<GymNotifications />} />
                    <Route path="/profile" element={<GymProfile />} />
                    <Route path="/tournaments" element={
                      <FeatureGuard feature="Tournament">
                        <PermissionGuard permission="view_tournaments">
                          <GymTournaments />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                    <Route path="/tournaments/:id" element={
                      <FeatureGuard feature="Tournament">
                        <PermissionGuard permission="view_tournaments">
                          <GymTournamentDetail />
                        </PermissionGuard>
                      </FeatureGuard>
                    } />
                  </Route>
                </Route>

                {/* Public Gym Auth */}
                <Route path="/auth" element={<GymLogin />} />
                <Route path="/auth/register" element={<GymRegister />} />
                <Route path="/auth/forgot-password" element={<GymForgotPassword />} />
                <Route path="/auth/reset-password" element={<GymResetPassword />} />

                {/* Super Admin Routes - Protected */}
                <Route element={<PrivateRoute allowedRoles={['SUPER_ADMIN']} />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/admin/dashboard" element={<Dashboard />} />
                    <Route path="/admin/members" element={<Members />} />
                    <Route path="/admin/plans" element={<MembershipPlans />} />
                    <Route path="/admin/features" element={<Features />} />
                    <Route path="/admin/payments" element={<Payments />} />
                    <Route path="/admin/reports" element={<Reports />} />
                    <Route path="/admin/settings" element={<SuperAdminSettings />} />
                    <Route path="/admin/contact-messages" element={<ContactMessages />} />
                    <Route path="/admin/coupons" element={<Coupons />} />
                    <Route path="/admin/permissions" element={<GymPermissions />} />
                  </Route>
                </Route>

                {/* Public Admin Auth */}
                <Route path="/admin/login" element={<Login />} />
                <Route path="/admin/forgot-password" element={<ForgotPassword />} />
                <Route path="/admin/reset-password" element={<ResetPassword />} />


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
