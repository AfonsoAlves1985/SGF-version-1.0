import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Package,
  Calendar,
  Building2,
  Wrench,
  FileText,
  BarChart3,
  AlertCircle,
  PenLine,
  Handshake,
  ShieldCheck,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { trpc } from "@/lib/trpc";

function CriticalStockAlertsWidget() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { data: consumables = [] } = trpc.consumables.list.useQuery({});

  const criticalItems = consumables.filter(
    (item: any) => item.status === "REPOR_ESTOQUE"
  );

  if (criticalItems.length === 0) {
    return null;
  }

  return (
    <Card className="bg-red-900/30 border-red-700/50 mb-8">
      <CardHeader>
        <CardTitle className="text-red-400 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Alertas de Stock Critico
        </CardTitle>
        <CardDescription className="text-red-300/70">
          {criticalItems.length} consumivel(is) necessitam reposicao imediata
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          {criticalItems.slice(0, 3).map((item: any) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-red-900/20 p-3 rounded border border-red-700/30"
            >
              <div className="flex-1">
                <p className="text-white font-medium">{item.name}</p>
                <p className="text-red-300/70 text-sm">
                  Estoque: {item.currentStock} {item.unit} (Minimo:{" "}
                  {item.minStock})
                </p>
              </div>
            </div>
          ))}
        </div>
        {criticalItems.length > 0 && (
          <Button
            onClick={() => setLocation("/consumables")}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Ver todos os alertas
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const modules = [
    {
      icon: PenLine,
      label: t("home.inventory"),
      description: t("home.inventory.desc"),
      path: "/inventory",
      color: "bg-orange-900/20 hover:bg-orange-900/30 border-orange-700/30",
    },
    {
      icon: Package,
      label: "Consumíveis",
      description: "Gestão de consumo e tendências de estoque",
      path: "/consumables",
      color: "bg-orange-900/20 hover:bg-orange-900/30 border-orange-700/30",
    },
    {
      icon: Building2,
      label: t("home.rooms"),
      description: t("home.rooms.desc"),
      path: "/rooms",
      color: "bg-orange-900/20 hover:bg-orange-900/30 border-orange-700/30",
    },
    {
      icon: Wrench,
      label: t("home.maintenance"),
      description: t("home.maintenance.desc"),
      path: "/maintenance",
      color: "bg-orange-900/20 hover:bg-orange-900/30 border-orange-700/30",
    },
    {
      icon: Handshake,
      label: t("home.suppliers"),
      description: t("home.suppliers.desc"),
      path: "/suppliers",
      color: "bg-orange-900/20 hover:bg-orange-900/30 border-orange-700/30",
    },
    {
      icon: FileText,
      label: "Contratos",
      description: "Gestão de contratos por unidade",
      path: "/contracts",
      color: "bg-orange-900/20 hover:bg-orange-900/30 border-orange-700/30",
    },
    {
      icon: BarChart3,
      label: t("home.dashboard"),
      description: t("home.dashboard.desc"),
      path: "/dashboard",
      color: "bg-orange-900/20 hover:bg-orange-900/30 border-orange-700/30",
    },
    ...(user?.role === "superadmin" || user?.role === "admin"
      ? [
          {
            icon: ShieldCheck,
            label: "Administração de Acessos",
            description: "Convites por link e permissões de usuários",
            path: "/access-management",
            color:
              "bg-orange-900/20 hover:bg-orange-900/30 border-orange-700/30",
          },
        ]
      : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-orange-600 mx-auto mb-4" />
          <p className="text-muted-foreground">{t("inventory.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header com Logo e Language Selector */}
      <div className="border-b border-border bg-card/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029190932/Ztp8T7Vpr2FQpGULvKFpsw/frz-logo-gold-3fS8xoBHwRKChvSMDViXhP.webp"
              alt="FRZ Logo"
              className="h-10 bg-transparent"
            />
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {t("home.title")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t("home.subtitle")}
              </p>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {isAuthenticated && user ? (
          <>
            {/* Saudação */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {t("app.welcome")}, {user.name}!
              </h2>
              <p className="text-muted-foreground">{t("home.subtitle")}</p>
            </div>

            {/* Critical Stock Alerts Widget */}
            <CriticalStockAlertsWidget />

            {/* Grid de Módulos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {modules.map(module => {
                const Icon = module.icon;
                return (
                  <Card
                    key={module.path}
                    onClick={() => setLocation(module.path)}
                    className={`cursor-pointer transition-all duration-300 transform hover:scale-105 border-2 ${module.color}`}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Icon className="h-8 w-8 text-orange-500" />
                        <CardTitle className="text-foreground">
                          {module.label}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-muted-foreground">
                        {module.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Dicas de Utilização */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-orange-500">
                  {t("home.tips")}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {t("home.tips.maximize")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold">
                      1
                    </div>
                    <p className="text-foreground">{t("home.tips.1")}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold">
                      2
                    </div>
                    <p className="text-foreground">{t("home.tips.2")}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold">
                      3
                    </div>
                    <p className="text-foreground">{t("home.tips.3")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Tela de Login */}
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="text-center mb-8">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029190932/Ztp8T7Vpr2FQpGULvKFpsw/frz-logo-gold-3fS8xoBHwRKChvSMDViXhP.webp"
                  alt="FRZ Logo"
                  className="h-24 mx-auto mb-6 bg-transparent"
                />
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  {t("home.title")}
                </h1>
                <p className="text-xl text-muted-foreground">
                  {t("home.subtitle")}
                </p>
              </div>
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 text-lg"
              >
                {t("app.welcome")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
