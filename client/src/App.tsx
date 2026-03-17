import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import InventoryHistory from "./pages/InventoryHistory";
import Schedule from "./pages/Schedule";
import Rooms from "./pages/Rooms";
import Maintenance from "./pages/Maintenance";
import Suppliers from "./pages/Suppliers";
import Dashboard from "./pages/Dashboard";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import { useEffect } from "react";
import { getLoginUrl } from "./const";
import { useLocation } from "wouter";

function Router() {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    // Se não está autenticado e não está na página inicial, redireciona para login
    if (!isAuthenticated && !loading && location !== "/") {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated, loading, location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, mostra apenas a página Home (que tem o botão de login)
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path={"/"} component={Home} />
        {/* Todas as outras rotas redirecionam para home */}
        <Route component={Home} />
      </Switch>
    );
  }

  // Se está autenticado, mostra o dashboard com todas as rotas
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Home} />
          <Route path={"inventory"} component={Inventory} />
      <Route path={"inventory-history"} component={InventoryHistory} />
      <Route path={"schedule"} component={Schedule} />
        <Route path={"/rooms"} component={Rooms} />
        <Route path={"/maintenance"} component={Maintenance} />
        <Route path={"/suppliers"} component={Suppliers} />
        <Route path={"/dashboard"} component={Dashboard} />
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
