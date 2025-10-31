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
import { AuthUser, hasPermission, isAdmin } from "@/lib/auth";
import { useAdminShortcuts } from "@/app/hooks/useKeyboardShortcuts";

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

  // Enable keyboard shortcuts
  useAdminShortcuts();

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
        } else {
          throw new Error(data.message || "Invalid token");
        }
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
      // Don't redirect - just set user to null
      setUser(null);
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
      setUser(null);
      // Reload the page to clear state
      window.location.href = "/admin";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Get navigation items based on user permissions
  const navItems = user ? [
    { name: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard', permission: 'dashboard:view' },
    { name: 'Messages', href: '/admin/messages', icon: 'MessageSquare', permission: 'messages:view' },
    { name: 'Leads', href: '/admin/leads', icon: 'Phone', permission: 'leads:view' },
    { name: 'Campaigns', href: '/admin/campaigns', icon: 'Target', permission: 'campaigns:view' },
    { name: 'Contacts', href: '/admin/contacts', icon: 'Users', permission: 'contacts:view' },
    { name: 'Data Import', href: '/admin/import', icon: 'Upload', permission: 'contacts:create' },
    { name: 'Analytics', href: '/admin/analytics', icon: 'BarChart3', permission: 'analytics:view' },
    { name: 'Settings', href: '/admin/settings', icon: 'Settings', permission: 'settings:manage' }
  ].filter(item => hasPermission(user, item.permission)) : [];

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
    // If we're on the login page, don't render the admin layout
    if (pathname === "/admin") {
      return null; // Let the login page render
    }
    // For other pages, show a message to login
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access this page.</p>
          <Link href="/admin" className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors">
            Go to Login
          </Link>
        </div>
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
          className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 border-b border-gray-200">
            <h1 className="text-lg sm:text-xl font-bold text-primary-600 truncate">
              QuickLoan Admin
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-1"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <nav className="mt-4 sm:mt-6 px-2 sm:px-3 pb-20">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const IconComponent =
                  iconMap[item.icon as keyof typeof iconMap] || LayoutDashboard;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)} // Close sidebar on mobile after navigation
                    className={`flex items-center px-3 py-2.5 sm:py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isActive
                        ? "bg-primary-100 text-primary-700"
                        : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User info at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 uppercase">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors duration-200"
            >
              <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:ml-64">
          {/* Top bar */}
          <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
            <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-500 hover:text-gray-700 active:text-gray-900 p-1"
                >
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                
                {/* Mobile: Show page title instead of search */}
                <h2 className="lg:hidden text-lg font-semibold text-gray-900 truncate">
                  {navItems.find(item => item.href === pathname)?.name || 'Dashboard'}
                </h2>
              </div>

              {/* Desktop search bar */}
              <div className="hidden lg:flex flex-1 max-w-lg mx-4">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search contacts, campaigns, messages..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4">
                <button className="relative text-gray-500 hover:text-gray-700 active:text-gray-900 p-1">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full"></span>
                </button>

                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {user.name}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Mobile search bar */}
            <div className="lg:hidden px-3 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-3 sm:p-4 lg:p-6">
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
