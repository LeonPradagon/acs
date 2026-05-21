"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, FileText, Database, ArrowLeft, Shield, Loader2, Menu, X, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    { name: "User Management", href: "/admin/users", icon: Users },
    { name: "Knowledge Base", href: "/admin/documents", icon: FileText },
    { name: "System Integrations", href: "/admin/integrations", icon: Database },
    { name: "AI Brain & Context", href: "/admin/ai-brain", icon: Brain },
  ];

  if (!mounted || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-medium">Verifying access...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <header className="lg:hidden border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-5 h-16 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight">Admin Console</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30 transition-all"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 w-[280px] shrink-0 border-r border-border/60 bg-card/50 flex flex-col h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 pb-2">
          <Link href="/analyst-workspace" className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors mb-8 group w-fit">
            <div className="p-1.5 rounded-md bg-muted group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            Back to Workspace
          </Link>
          
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-foreground text-[15px]">Admin Console</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">Super Admin</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-3">System Navigation</div>
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative bg-background">
        <div className="max-w-6xl mx-auto p-5 md:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
