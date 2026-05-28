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

    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';

    const lastSegment = segments[segments.length - 1];

    // Check if the last segment is a numeric ID or a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isId = !isNaN(Number(lastSegment)) || uuidRegex.test(lastSegment);

    if (isId && segments.length > 1) {
      const parentSegment = segments[segments.length - 2];
      const cleanParent = parentSegment.replace(/[-_]/g, ' ');
      const formattedParent = cleanParent
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      if (formattedParent.endsWith('s')) {
        return formattedParent.slice(0, -1) + ' Detail';
      }
      return formattedParent + ' Detail';
    }

    const cleanSegment = lastSegment.replace(/[-_]/g, ' ');
    return cleanSegment
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
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
