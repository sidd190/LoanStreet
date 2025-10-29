"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Target,
  Phone,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  User,
  Upload,
  BarChart3,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { AuthUser } from "@/lib/auth";
import {
  getAccessibleNavItems,
  validateRoutePermissions,
} from "@/lib/permissions";

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Create a context to share user data with child components
export const AdminContext = React.createContext<{
  user: AuthUser | null;
  loading: boolean;
}>({
  user: null,
  loading: true,
});

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuthentication();
  }, []); // Only run once when component mounts

  const checkAuthentication = async () => {
    try {
      // Fetch user profile to get current permissions
      const response = await fetch("/api/auth/me", {
        credentials: "include", // Include cookies in the request
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.user) {
          setUser(data.user);

          // Redirect employees to employee interface if they try to access admin-only pages
          if (data.user.role === "EMPLOYEE") {
            const adminOnlyRoutes = [
              "/admin/campaigns",
              "/admin/contacts",
              "/admin/import",
              "/admin/analytics",
              "/admin/automation",
            ];

            if (adminOnlyRoutes.some((route) => pathname.startsWith(route))) {
              router.push("/admin/dashboard");
              return;
            }
          }

          // Validate route permissions
          console.log("🔐 AdminLayout: Current pathname:", pathname);
          console.log("🔐 AdminLayout: User role:", data.user.role);
          console.log(
            "🔐 AdminLayout: User permissions:",
            data.user.permissions
          );

          const routeValidation = validateRoutePermissions(data.user, pathname);
          console.log(
            "🔐 AdminLayout: Route validation result:",
            JSON.stringify(routeValidation, null, 2)
          );
          if (!routeValidation.allowed && routeValidation.redirectTo) {
            console.log(
              "🔄 AdminLayout: Route validation failed, redirecting to:",
              routeValidation.redirectTo,
              "Reason:",
              routeValidation.reason
            );
            router.push(routeValidation.redirectTo);
            return;
          }
        } else {
          console.log(
            "❌ AdminLayout: Auth response indicates failure:",
            data.message || "No success flag or user data"
          );
          console.log(
            "❌ AdminLayout: Full response data:",
            JSON.stringify(data)
          );
          throw new Error(data.message || "Invalid token");
        }
      } else {
        console.log(
          "❌ AdminLayout: Auth request failed with status:",
          response.status
        );
        const errorData = await response.json().catch(() => ({}));
        console.log("❌ AdminLayout: Error response:", errorData);
        throw new Error("Authentication failed");
      }
    } catch (error) {
      console.error("❌ AdminLayout: Authentication check failed:", error);
      // Only redirect to login if we're not already on the login page
      if (pathname !== "/admin") {
        console.log("🔄 AdminLayout: Redirecting to login page");
        router.push("/admin");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.push("/admin");
    }
  };

  // Get navigation items based on user permissions
  const navItems = user ? getAccessibleNavItems(user) : [];

  // Icon mapping
  const iconMap = {
    LayoutDashboard,
    Users,
    MessageSquare,
    Target,
    Phone,
    Settings,
    Upload,
    BarChart3,
    Calendar,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    // If authentication failed and we're not on the login page, redirect will happen in checkAuthentication
    // If we're on the login page, don't render the admin layout
    if (pathname === "/admin") {
      return null; // Let the login page render
    }
    // For other pages, show loading while redirect happens
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ user, loading }}>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-primary-600">
              QuickLoan Admin
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="mt-6 px-3">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const IconComponent =
                  iconMap[item.icon as keyof typeof iconMap] || LayoutDashboard;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isActive
                        ? "bg-primary-100 text-primary-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User info at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:ml-64">
          {/* Top bar */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>

              <div className="flex-1 max-w-lg mx-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search contacts, campaigns, messages..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button className="relative text-gray-500 hover:text-gray-700">
                  <Bell className="w-6 h-6" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                </button>

                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
