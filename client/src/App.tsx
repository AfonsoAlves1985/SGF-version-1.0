import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
const NotFound = lazy(() => import("@/pages/NotFound"));
const Home = lazy(() => import("./pages/Home"));
const Inventory = lazy(() => import("./pages/Inventory"));
const InventoryHistory = lazy(() => import("./pages/InventoryHistory"));
const Rooms = lazy(() => import("./pages/Rooms"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const SuppliersAndPurchases = lazy(
  () => import("./pages/SuppliersAndPurchases")
);
const PurchaseRequests = lazy(() => import("./pages/PurchaseRequests"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Consumables = lazy(() => import("./pages/Consumables"));
const AccessManagement = lazy(() => import("./pages/AccessManagement"));
const Logs = lazy(() => import("./pages/Logs"));
const DashboardLayout = lazy(() => import("./components/DashboardLayout"));
const Login = lazy(() => import("./pages/Login"));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      Carregando...
    </div>
  );
}

function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("auth-token");

  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  if (!token) {
    return null;
  }

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  const [location, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("auth-token")
  );
  const hasInviteToken =
    location === "/login" &&
    new URLSearchParams(window.location.search).has("inviteToken");

  useEffect(() => {
    const syncToken = () => {
      setToken(localStorage.getItem("auth-token"));
    };

    const authChangedHandler: EventListener = () => syncToken();

    window.addEventListener("storage", syncToken);
    window.addEventListener("auth-token-changed", authChangedHandler);

    return () => {
      window.removeEventListener("storage", syncToken);
      window.removeEventListener("auth-token-changed", authChangedHandler);
    };
  }, []);

  useEffect(() => {
    if (!token && location !== "/login") {
      setLocation("/login");
    }
  }, [location, setLocation, token]);

  useEffect(() => {
    if (token && location === "/login" && !hasInviteToken) {
      setLocation("/");
    }
  }, [hasInviteToken, location, setLocation, token]);

  if (!token) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Login />
      </Suspense>
    );
  }

  if (location === "/login") {
    return (
      <Suspense fallback={<PageFallback />}>
        <PageFallback />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <DashboardLayout>
        <Switch>
          <Route path={"/"} component={Home} />
          <Route path={"/inventory"} component={Inventory} />
          <Route path={"/inventory-history"} component={InventoryHistory} />
          <Route path={"/rooms"} component={Rooms} />
          <Route path={"/maintenance"} component={Maintenance} />
          <Route path={"/suppliers"} component={SuppliersAndPurchases} />
          <Route path={"/purchase-requests"} component={PurchaseRequests} />
          <Route path={"/contracts"} component={Contracts} />
          <Route path={"/consumables"} component={Consumables} />
          <Route path={"/dashboard"} component={Dashboard} />
          <Route path={"/access-management"} component={AccessManagement} />
          <Route path={"/logs"} component={Logs} />
          <Route path={"/login"} component={Login} />
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider defaultTheme="dark" switchable>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
