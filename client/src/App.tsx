import { Suspense, lazy, useEffect } from "react";
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
const SuppliersAndPurchases = lazy(() => import("./pages/SuppliersAndPurchases"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Consumables = lazy(() => import("./pages/Consumables"));
const DashboardLayout = lazy(() => import("./components/DashboardLayout"));
const Login = lazy(() => import("./pages/Login"));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      Carregando...
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
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
  const [location] = useLocation();
  const token = localStorage.getItem("auth-token");

  if (location === "/login") {
    return (
      <Suspense fallback={<PageFallback />}>
        <Login />
      </Suspense>
    );
  }

  if (!token) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Login />
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
          <Route path={"/contracts"} component={Contracts} />
          <Route path={"/consumables"} component={Consumables} />
          <Route path={"/dashboard"} component={Dashboard} />
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
