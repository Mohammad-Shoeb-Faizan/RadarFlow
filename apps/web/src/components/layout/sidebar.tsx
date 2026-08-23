"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Server,
  AlertTriangle,
  FileText,
  Activity,
  GitFork,
  Rocket,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sparkles,
  Command,
  HelpCircle,
  LogOut,
  User,
  Building2,
  ChevronUp,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  badge?: number;
}

export const mainNavigation: NavItem[] = [
  { name: "Overview", href: "/", icon: LayoutDashboard, shortcut: "G O" },
  { name: "Services", href: "/services", icon: Server, shortcut: "G S" },
  { name: "Incidents", href: "/incidents", icon: AlertTriangle, shortcut: "G I" },
  { name: "Logs", href: "/logs", icon: FileText, shortcut: "G L" },
  { name: "Metrics", href: "/metrics", icon: Activity, shortcut: "G M" },
  { name: "Traces", href: "/traces", icon: GitFork, shortcut: "G T" },
  { name: "Deployments", href: "/deployments", icon: Rocket, shortcut: "G D" },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({
  onOpenShortcuts,
  onOpenCommand,
  isMobileOpen = false,
  onCloseMobile,
}: {
  onOpenShortcuts?: () => void;
  onOpenCommand?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    role?: string;
    organization?: string;
  }>({
    name: "Alex Dev",
    email: "admin@radarflow.io",
    role: "owner",
    organization: "RadarFlow Team",
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch actual authenticated user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser({
              name: data.user.name || "Alex Dev",
              email: data.user.email || "admin@radarflow.io",
              role: data.user.role || data.organization?.role || "owner",
              organization: data.organization?.name || "RadarFlow Team",
            });
          }
        }
      } catch (err) {
        console.error("Failed to load user session", err);
      }
    };
    fetchUser();
  }, []);

  // Click outside and Escape to close user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        onCloseMobile?.();
      }
    };

    if (isUserMenuOpen || isMobileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen, isMobileOpen, onCloseMobile]);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    onCloseMobile?.();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Logged out successfully");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to logout");
    }
  };

  const userInitials =
    user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "AD";

  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-border/70">
          <Link
            href="/"
            onClick={() => isMobile && onCloseMobile?.()}
            className="flex items-center gap-2.5 overflow-hidden"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 text-primary shadow-[0_0_12px_rgba(42,142,255,0.25)]">
              <svg
                className="h-4.5 w-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a10 10 0 1 0 10 10" />
                <path d="M12 6a6 6 0 1 0 6 6" />
                <path d="M12 10a2 2 0 1 0 2 2" />
                <path d="M12 12l7-7" />
              </svg>
            </div>
            {(!collapsed || isMobile) && (
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                  RadarFlow
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/25">
                    v0.1
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono truncate">
                  {user.organization || "Production Cloud"}
                </span>
              </div>
            )}
          </Link>

          {isMobile ? (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors hidden md:block"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <div className="overflow-y-auto py-3 px-2 space-y-1">
          {(!collapsed || isMobile) && (
            <div className="px-2 pb-1.5 pt-1 text-[11px] font-medium tracking-wider uppercase text-muted-foreground/70 font-mono">
              Observability
            </div>
          )}

          {mainNavigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => isMobile && onCloseMobile?.()}
                className={clsx(
                  "group flex items-center gap-3 rounded-md px-2.5 py-2.5 sm:py-2 text-xs font-medium transition-all duration-150 relative min-h-[44px] sm:min-h-0",
                  isActive
                    ? "bg-primary/15 text-primary font-semibold border border-primary/20 shadow-[0_0_15px_rgba(42,142,255,0.12)]"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
                title={collapsed && !isMobile ? `${item.name} (${item.shortcut || ""})` : undefined}
              >
                <Icon
                  className={clsx(
                    "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {(!collapsed || isMobile) && (
                  <div className="flex flex-1 items-center justify-between overflow-hidden">
                    <span className="truncate">{item.name}</span>
                    {item.shortcut && (
                      <span className="text-[10px] font-mono text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Utility & User Area */}
      <div className="p-2 border-t border-border/70 space-y-1 relative" ref={menuRef}>
        {/* User Account Popover */}
        {isUserMenuOpen && (
          <div
            className={clsx(
              "absolute bottom-full mb-2 bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl z-50 p-1.5 font-mono animate-in fade-in zoom-in-95 duration-150",
              collapsed && !isMobile ? "left-2 w-64" : "left-2 right-2"
            )}
          >
            {/* Popover Header: User Details */}
            <div className="p-2.5 border-b border-border/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground truncate">{user.name}</span>
                <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 text-primary border-primary/30">
                  {user.role}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
              <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1 pt-0.5">
                <Building2 className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate">{user.organization}</span>
              </div>
            </div>

            {/* Menu Options */}
            <div className="py-1 space-y-0.5 text-xs">
              <Link
                href="/settings"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  if (isMobile) onCloseMobile?.();
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 sm:py-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors min-h-[40px] sm:min-h-0"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Workspace Settings</span>
              </Link>

              {onOpenCommand && (
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (isMobile) onCloseMobile?.();
                    onOpenCommand();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 sm:py-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-left min-h-[40px] sm:min-h-0"
                >
                  <span className="flex items-center gap-2.5">
                    <Command className="h-3.5 w-3.5" />
                    <span>Command Palette</span>
                  </span>
                  <kbd className="font-mono text-[9px] bg-muted px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
                </button>
              )}

              {onOpenShortcuts && (
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (isMobile) onCloseMobile?.();
                    onOpenShortcuts();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 sm:py-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-left min-h-[40px] sm:min-h-0"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>Keyboard Shortcuts</span>
                  </span>
                  <kbd className="font-mono text-[9px] bg-muted px-1.5 py-0.5 rounded border border-border">?</kbd>
                </button>
              )}
            </div>

            {/* Logout Action */}
            <div className="pt-1 border-t border-border/50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 sm:py-1.5 rounded-md text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors text-left text-xs font-semibold min-h-[40px] sm:min-h-0"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}

        {/* User Account Trigger Button */}
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className={clsx(
            "w-full flex items-center gap-2 rounded-lg p-1.5 text-left transition-all duration-150 border border-transparent min-h-[44px] sm:min-h-0",
            isUserMenuOpen
              ? "bg-accent/80 border-border/70 shadow-sm"
              : "hover:bg-accent/60 hover:border-border/40",
            collapsed && !isMobile ? "justify-center" : "justify-between"
          )}
          title={collapsed && !isMobile ? `${user.name} (${user.email}) - Click for account menu` : undefined}
          aria-haspopup="true"
          aria-expanded={isUserMenuOpen}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 shadow-[0_0_8px_rgba(42,142,255,0.2)]">
              {userInitials}
            </div>
            {(!collapsed || isMobile) && (
              <div className="flex flex-col truncate font-mono">
                <span className="text-xs font-semibold text-foreground truncate">{user.name}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
              </div>
            )}
          </div>

          {(!collapsed || isMobile) && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" title="System connected" />
              <ChevronUp
                className={clsx(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  isUserMenuOpen ? "rotate-0" : "rotate-180 opacity-60"
                )}
              />
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={clsx(
          "hidden md:flex flex-col border-r border-border/80 bg-card/90 backdrop-blur-md transition-all duration-300 select-none z-30 h-screen sticky top-0 shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Overlay */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-card border-r border-border shadow-2xl h-full flex flex-col z-50 animate-in slide-in-from-left duration-200">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
