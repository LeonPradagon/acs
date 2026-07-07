"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, FileText, Database, Shield, Loader2, Menu, X, Brain, LogOut, ShieldAlert, BarChart3, Settings, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if user has admin/superadmin role
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        router.replace("/login");
        return;
      }

      const user = JSON.parse(userStr);
      if (user.role === "admin" || user.role === "superadmin") {
        setIsAuthorized(true);
      } else {
        // Non-admin user — redirect back to workspace
        router.replace("/analyst-workspace");
      }
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const menuItems = [
    { name: "Analytics Dashboard", href: "/admin/analytics", icon: BarChart3 },
    { name: "User Management", href: "/admin/users", icon: Users },
    { name: "Knowledge Base", href: "/admin/documents", icon: FileText },
    { name: "Prompt Manager", href: "/admin/prompts", icon: Settings },
    { name: "AI Brain & Context", href: "/admin/ai-brain", icon: Brain },
    { name: "Security Logs", href: "/admin/security", icon: ShieldAlert },
    { name: "Observability Traces", href: "/admin/observability", icon: Activity },
    { name: "System Integrations", href: "/admin/integrations", icon: Database },
  ];

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  if (!mounted || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">Verifying access...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col lg:flex-row relative overflow-hidden">
      {/* Dynamic Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-ambient-grid opacity-30"></div>
        <div className="glow-orb top-[-10%] left-[-10%]"></div>
        <div className="glow-orb-2 bottom-[-10%] right-[-10%]"></div>
      </div>

      {/* Mobile Top Header */}
      <header className="lg:hidden border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-5 h-16 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white">Admin Console</span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[8px] font-bold">
              {process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0"}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-all"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 shrink-0 border-r border-white/10 bg-black/40 backdrop-blur-xl flex flex-col h-screen shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-40 transition-all duration-300 ease-in-out lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "w-[80px]" : "w-[280px]"
      )}>
        <div className={cn("p-6 pb-2 transition-all", isCollapsed ? "px-4" : "")}>
          <div className={cn("flex items-center mb-8", isCollapsed ? "justify-center" : "gap-3 px-2")}>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white shrink-0 relative group">
              <Shield className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-white text-[15px] truncate">Admin Console</span>
                </div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold mt-0.5 truncate">Super Admin</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto no-scrollbar">
          {!isCollapsed && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-3 px-3">System Navigation</div>
          )}
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 group relative",
                  isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-3",
                  isActive
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
                )}
              >
                {isActive && isCollapsed && (
                  <div className="absolute left-0 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                )}
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                )}
                <item.icon className={cn("shrink-0 transition-transform group-hover:scale-110", isCollapsed ? "w-5 h-5" : "w-[18px] h-[18px]")} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 mt-auto border-t border-white/10">
          <button 
            onClick={handleLogout} 
            title={isCollapsed ? "Logout" : undefined}
            className={cn(
              "flex items-center rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all duration-200",
              isCollapsed ? "justify-center p-3 w-full" : "gap-3 px-3 py-3 w-full text-left"
            )}
          >
            <LogOut className={cn("shrink-0", isCollapsed ? "w-5 h-5" : "w-[18px] h-[18px]")} />
            {!isCollapsed && "Secure Logout"}
          </button>
        </div>
        
        {/* Collapse Toggle Button (Desktop only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-indigo-600 rounded-full items-center justify-center text-white shadow-[0_0_10px_rgba(99,102,241,0.5)] border border-indigo-400/30 hover:scale-110 transition-transform z-50"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-7xl mx-auto p-5 md:p-8 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
