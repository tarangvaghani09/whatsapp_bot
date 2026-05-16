import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import DashboardPage from "@/pages/Dashboard";
import FaqsPage from "@/pages/Faqs";
import ServicesPage from "@/pages/Services";
import BookingsPage from "@/pages/Bookings";
import CustomersPage from "@/pages/Customers";
import AiUsagePage from "@/pages/AiUsage";
import SettingsPage from "@/pages/SettingsPage";
import TestBotPage from "@/pages/TestBotPage";
import BusinessesPage from "@/pages/Businesses";
import CannedResponsesPage from "@/pages/CannedResponses";
import DeliveryFailuresPage from "@/pages/DeliveryFailures";
import AdminUsersPage from "@/pages/AdminUsers";
import { BusinessProvider } from "@/context/BusinessContext";
import AuthPage from "@/pages/AuthPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard | WhatsApp Bot Admin",
  "/faqs": "FAQs | WhatsApp Bot Admin",
  "/services": "Services | WhatsApp Bot Admin",
  "/bookings": "Bookings | WhatsApp Bot Admin",
  "/customers": "Customers | WhatsApp Bot Admin",
  "/ai-usage": "AI Usage | WhatsApp Bot Admin",
  "/test-bot": "Test Bot | WhatsApp Bot Admin",
  "/settings": "Settings | WhatsApp Bot Admin",
  "/businesses": "Businesses | WhatsApp Bot Admin",
  "/canned-responses": "Canned Responses | WhatsApp Bot Admin",
  "/delivery-failures": "Delivery Failures | WhatsApp Bot Admin",
  "/admin-users": "Admin Users | WhatsApp Bot Admin",
  "/login": "Login | WhatsApp Bot Admin",
  "/forgot-password": "Forgot Password | WhatsApp Bot Admin",
  "/reset-password": "Reset Password | WhatsApp Bot Admin",
};

function PageTitleManager() {
  const [location] = useLocation();
  useEffect(() => {
    document.title = PAGE_TITLES[location] ?? "Not Found | WhatsApp Bot Admin";
  }, [location]);
  return null;
}

type RouterProps = {
  authed: boolean;
  role: "super_admin" | "business_admin";
  setAuthed: (value: boolean) => void;
  refreshSession: () => Promise<void>;
};

function Router({ authed, role, setAuthed, refreshSession }: RouterProps) {
  const [location, setLocation] = useLocation();
  const authPath = location === "/login" || location === "/forgot-password" || location === "/reset-password";
  const restrictedForBusinessAdmin = location === "/test-bot" || location === "/businesses" || location === "/admin-users";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
    setLocation("/login");
  }

  useEffect(() => {
    if (!authed && !authPath) setLocation("/login");
    if (authed && authPath) setLocation("/");
    if (authed && role === "business_admin" && restrictedForBusinessAdmin) setLocation("/");
  }, [authed, authPath, role, restrictedForBusinessAdmin, setLocation]);

  if (!authed) {
    if (!authPath) return null;
    return (
      <>
        <PageTitleManager />
        <AuthPage onAuthed={() => { void refreshSession(); }} />
      </>
    );
  }

  if (authPath) return null;

  return (
    <BusinessProvider>
      <Layout onLogout={handleLogout}>
        <PageTitleManager />
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/faqs" component={FaqsPage} />
          <Route path="/services" component={ServicesPage} />
          <Route path="/bookings" component={BookingsPage} />
          <Route path="/customers" component={CustomersPage} />
          <Route path="/ai-usage" component={AiUsagePage} />
          <Route path="/test-bot" component={TestBotPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/businesses" component={BusinessesPage} />
          <Route path="/canned-responses" component={CannedResponsesPage} />
          <Route path="/delivery-failures" component={DeliveryFailuresPage} />
          <Route path="/admin-users" component={AdminUsersPage} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </BusinessProvider>
  );
}

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<"super_admin" | "business_admin">("super_admin");

  async function refreshSession() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setAuthed(false);
        setRole("super_admin");
        return;
      }
      const data = await res.json();
      setAuthed(true);
      setRole(data?.user?.role === "business_admin" ? "business_admin" : "super_admin");
    } catch {
      setAuthed(false);
      setRole("super_admin");
    }
  }

  useEffect(() => {
    let mounted = true;
    refreshSession()
      .finally(() => {
        if (!mounted) return;
        setAuthChecked(true);
      });
    return () => { mounted = false; };
  }, []);

  if (!authChecked) {
    return <div className="min-h-screen grid place-items-center text-gray-500">Checking session...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router authed={authed} role={role} setAuthed={setAuthed} refreshSession={refreshSession} />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
