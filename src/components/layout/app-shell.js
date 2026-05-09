"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutDashboard, BookOpen, PlusCircle, Target, LogOut, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";

const sidebarNavItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Subjects", href: "/subjects", icon: BookOpen },
  { title: "Add Subject", href: "/subjects/new", icon: PlusCircle },
  { title: "Revision", href: "/revision", icon: RefreshCw },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const isActive = (href) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <div className="flex min-h-screen">
      {/* ─── Desktop Sidebar ───────────────────────── */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar sticky top-0 h-screen">
        <Link href="/dashboard" className="p-5 flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center transition-transform group-hover:scale-105">
            <Target className="w-4.5 h-4.5 text-background" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Adaptex</span>
        </Link>

        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-1 py-3">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <motion.span
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                      active
                        ? "bg-foreground/[0.06] text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-foreground rounded-r-full"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon className="w-[18px] h-[18px]" />
                    {item.title}
                  </motion.span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-3 border-t border-border/50">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-7 h-7 rounded-full ring-1 ring-border" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                {user.email?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-tight">{user.user_metadata?.full_name || "User"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground text-xs h-8" onClick={handleSignOut}>
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </Button>
        </div>
      </aside>

      {/* ─── Main ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 border-b flex items-center justify-between px-4 bg-background/80 backdrop-blur-md sticky top-0 z-20 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
              <Target className="w-4 h-4 text-background" />
            </div>
            <span className="font-semibold text-sm">Adaptex</span>
          </Link>
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="" className="w-7 h-7 rounded-full ring-1 ring-border" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
              {user.email?.[0]?.toUpperCase() || "U"}
            </div>
          )}
        </header>
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">{children}</main>
      </div>

      {/* ─── Mobile Bottom Nav ─────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-background/80 backdrop-blur-md border-t">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {sidebarNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors relative",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.title}</span>
                  {active && (
                    <motion.div
                      layoutId="mobile-active"
                      className="absolute -top-0.5 w-5 h-[2px] bg-foreground rounded-full"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
