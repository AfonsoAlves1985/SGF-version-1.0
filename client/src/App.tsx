import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import InventoryHistory from "./pages/InventoryHistory";
import Rooms from "./pages/Rooms";
import Maintenance from "./pages/Maintenance";
import SuppliersAndPurchases from "./pages/SuppliersAndPurchases";
import Contracts from "./pages/Contracts";
import Dashboard from "./pages/Dashboard";
import Consumables from "./pages/Consumables";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";

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
    return <Login />;
  }

  if (!token) {
    return <Login />;
  }

  return (
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
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider defaultTheme="dark">
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
