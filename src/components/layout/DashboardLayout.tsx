import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";
import { Outlet, useLocation } from "react-router-dom";

interface DashboardLayoutProps {
  children?: React.ReactNode;
  title?: string;
  hideSidebar?: boolean;
}

export function DashboardLayout({ children, title, hideSidebar = false }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Function to get title from current path if not provided
  const getPageTitle = () => {
    if (title) return title;

    const path = location.pathname.split('/').pop() || 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Overlay */}
      {mobileOpen && !hideSidebar && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile by default */}
      {!hideSidebar && (
        <div className={cn(
          "lg:block",
          mobileOpen ? "block" : "hidden"
        )}>
          <AppSidebar
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
        </div>
      )}

      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-300",
          hideSidebar ? "" : (sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")
        )}
      >
        <TopBar
          title={getPageTitle()}
          onMenuClick={() => setMobileOpen(!mobileOpen)}
          hideMenuButton={hideSidebar}
        />
        <main className="p-4 lg:p-6 animate-fade-in">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
