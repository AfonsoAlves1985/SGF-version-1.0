import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, Calendar, Building2, Wrench, FileText, BarChart3 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const modules = [
    {
      icon: Package,
      label: t("home.inventory"),
      description: t("home.inventory.desc"),
      path: "/inventory",
      color: "bg-orange-900/20 hover:bg-orange-900/30 border-orange-700/30",
    },
    {
      icon: Calendar,
      label: t("home.schedule"),
      description: t("home.schedule.desc"),
      path: "/schedule",
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
      icon: FileText,
      label: t("home.suppliers"),
      description: t("home.suppliers.desc"),
      path: "/suppliers",
      color: "bg-orange-900/20 hover:bg-orange-900/30 border-orange-700/30",
    },
    {
      icon: BarChart3,
      label: t("home.dashboard"),
      description: t("home.dashboard.desc"),
      path: "/dashboard",
      color: "bg-orange-900/20 hover:bg-orange-900/30 border-orange-700/30",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-orange-600 mx-auto mb-4" />
          <p className="text-gray-400">{t("inventory.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header com Logo e Language Selector */}
      <div className="border-b border-orange-700/20 bg-slate-800/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029190932/Ztp8T7Vpr2FQpGULvKFpsw/frz-logo-gold-3fS8xoBHwRKChvSMDViXhP.webp" 
              alt="FRZ Logo" 
              className="h-10 bg-transparent" 
            />
            <div>
              <h1 className="text-lg font-bold text-white">{t("home.title")}</h1>
              <p className="text-xs text-gray-400">{t("home.subtitle")}</p>
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
              <h2 className="text-3xl font-bold text-white mb-2">
                {t("app.welcome")}, {user.name}!
              </h2>
              <p className="text-gray-400">{t("home.subtitle")}</p>
            </div>

            {/* Grid de Módulos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {modules.map((module) => {
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
                        <CardTitle className="text-white">{module.label}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-400">{module.description}</CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Dicas de Utilização */}
            <Card className="bg-slate-800/50 border-orange-700/20">
              <CardHeader>
                <CardTitle className="text-orange-500">{t("home.tips")}</CardTitle>
                <CardDescription className="text-gray-400">{t("home.tips.maximize")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold">
                      1
                    </div>
                    <p className="text-gray-300">{t("home.tips.1")}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold">
                      2
                    </div>
                    <p className="text-gray-300">{t("home.tips.2")}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold">
                      3
                    </div>
                    <p className="text-gray-300">{t("home.tips.3")}</p>
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
                <h1 className="text-4xl font-bold text-white mb-2">{t("home.title")}</h1>
                <p className="text-xl text-gray-400">{t("home.subtitle")}</p>
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
