import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageCircleQuestion,
  Scissors,
  CalendarCheck,
  Users,
  BrainCircuit,
  Settings,
  FlaskConical,
  Menu,
  X,
  Bot,
  Building2,
  UserCog,
  ChevronDown,
  Check,
  Plus,
  MessageSquareText,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useBusinessContext } from "@/context/BusinessContext";
import { useQueryClient } from "@tanstack/react-query";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useDeliveryFailureCount } from "@/hooks/useDeliveryFailureCount";
type AdminRole = "super_admin" | "business_admin";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/faqs", label: "FAQs", icon: MessageCircleQuestion },
  { href: "/services", label: "Services", icon: Scissors },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/customers", label: "Customers", icon: Users, badge: "unread" as const },
  { href: "/canned-responses", label: "Canned Responses", icon: MessageSquareText },
  { href: "/ai-usage", label: "AI Usage", icon: BrainCircuit },
  { href: "/delivery-failures", label: "Delivery Failures", icon: AlertTriangle, badge: "failures" as const },
  { href: "/test-bot", label: "Test Bot", icon: FlaskConical },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/businesses", label: "Businesses", icon: Building2 },
  { href: "/admin-users", label: "Admin Users", icon: UserCog },
];

function BusinessSelector({ onClose, role }: { onClose?: () => void; role: AdminRole }) {
  const { businesses, businessId, setBusinessId, loading, refetch } = useBusinessContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const current = businesses.find((b) => b.id === businessId);

  function selectBusiness(id: number) {
    setBusinessId(id);
    qc.invalidateQueries();
    setOpen(false);
    onClose?.();
  }

  if (loading) {
    return <div className="px-3 py-2 text-xs text-gray-400">Loading...</div>;
  }

  if (businesses.length === 0) {
    if (role === "business_admin") {
      return <div className="px-3 py-2 text-xs text-gray-400">No business access assigned</div>;
    }
    return (
      <Link
        href="/businesses"
        onClick={onClose}
        className="flex items-center gap-2 px-3 py-2 mx-3 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add your first business
      </Link>
    );
  }

  return (
    <div className="relative px-3 pb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors text-left"
      >
        <Building2 className="w-4 h-4 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">{current?.name ?? "Select business"}</p>
          <p className="text-[10px] text-gray-400 leading-tight">Active business</p>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="sidebar-scroll py-1 max-h-48 overflow-y-auto">
            {businesses.map((b) => (
              <button
                key={b.id}
                onClick={() => selectBusiness(b.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className="flex-1 text-sm text-gray-700 truncate font-medium">{b.name}</span>
                {b.id === businessId && <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />}
              </button>
            ))}
          </div>
          {role === "super_admin" && (
            <div className="border-t border-gray-100 p-1">
              <Link
                href="/businesses"
                onClick={() => { setOpen(false); onClose?.(); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-xs text-gray-500 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Manage businesses
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UnreadBadge({ count, color = "red" }: { count: number; color?: "red" | "amber" }) {
  if (count === 0) return null;
  const cls = color === "amber"
    ? "bg-amber-500 text-white animate-pulse"
    : "bg-red-500 text-white animate-pulse";
  return (
    <span className={`ml-auto min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center leading-none shadow-sm ${cls}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Layout({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<AdminRole>("super_admin");
  const { businessId } = useBusinessContext();
  const { count: unreadCount, markRead } = useUnreadMessages(businessId ?? undefined);
  const { count: failureCount, clear: clearFailures } = useDeliveryFailureCount(businessId ?? undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        const nextRole = data?.user?.role === "business_admin" ? "business_admin" : "super_admin";
        setRole(nextRole);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (location === "/customers") {
      markRead();
    }
    if (location === "/delivery-failures") {
      clearFailures();
    }
  }, [location, markRead, clearFailures]);

  const anyAlert = failureCount > 0;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "sidebar-scroll fixed inset-y-0 left-0 z-30 w-64 h-screen bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 overflow-y-auto overscroll-contain",
          "lg:static lg:inset-auto lg:h-auto lg:min-h-full lg:self-stretch lg:overflow-visible lg:overscroll-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
          <Bot className="w-7 h-7 text-green-600" />
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">WhatsApp Bot</p>
            <p className="text-xs text-gray-500">Admin Dashboard</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="pt-3 border-b border-gray-100 pb-1">
          <BusinessSelector onClose={() => setOpen(false)} role={role} />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems
            .filter((item) => {
              if (role !== "business_admin") return true;
              return item.href !== "/test-bot" && item.href !== "/businesses" && item.href !== "/admin-users";
            })
            .map(({ href, label, icon: Icon, badge }) => {
            const active = location === href;
            const badgeCount =
              badge === "unread" ? unreadCount :
              badge === "failures" ? failureCount :
              0;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-green-50 text-green-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
                onClick={() => setOpen(false)}
              >
                <Icon className={cn(
                  "w-4 h-4 flex-shrink-0",
                  active ? "text-green-600" :
                  badge === "failures" && failureCount > 0 ? "text-amber-500" :
                  "text-gray-400"
                )} />
                <span className="flex-1">{label}</span>
                <UnreadBadge
                  count={badgeCount}
                  color={badge === "failures" ? "amber" : "red"}
                />
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs font-semibold text-green-700">Cost Saving Mode</p>
            <p className="text-xs text-green-600 mt-0.5">FAQ-first · AI only as fallback</p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setOpen(true)} className="relative">
            <Menu className="w-5 h-5 text-gray-500" />
            {(unreadCount > 0 || anyAlert) && (
              <span className={cn(
                "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white",
                anyAlert ? "bg-amber-500" : "bg-red-500"
              )} />
            )}
          </button>
          <span className="font-semibold text-gray-800 text-sm">WhatsApp Bot Admin</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto lg:overflow-visible">{children}</main>
      </div>
    </div>
  );
}

